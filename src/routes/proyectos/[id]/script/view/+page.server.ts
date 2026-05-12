import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { UPLOADS_DIR } from '$env/static/private';
import { db } from '$lib/server/db';
import { proyectos, scripts } from '$lib/server/db/schema';
import { getScriptExt } from '$lib/server/script-text';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) error(400, 'id inválido');

	const [proyecto] = await db.select().from(proyectos).where(eq(proyectos.id, id));
	if (!proyecto) error(404, 'Proyecto no encontrado');

	const [script] = await db.select().from(scripts).where(eq(scripts.proyectoId, id));
	if (!script) error(404, 'No hay script subido para este proyecto');

	const ext = getScriptExt(script.filename);

	// PDFs no se convierten a HTML — el <iframe> los renderiza nativo
	if (ext === '.pdf') {
		return { proyecto, script, ext, html: null };
	}

	const filepath = path.join(UPLOADS_DIR, 'scripts', script.filename);

	let buffer: Buffer;
	try {
		buffer = await readFile(filepath);
	} catch {
		error(404, 'Archivo del script no disponible');
	}

	const result = await mammoth.convertToHtml({ buffer });

	return {
		proyecto,
		script,
		ext,
		html: result.value
	};
};
