import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR } from '$env/static/private';
import { db } from '$lib/server/db';
import { scripts } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const MIME = {
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.doc': 'application/msword'
} as const;

export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) error(400, 'id inválido');

	const [script] = await db.select().from(scripts).where(eq(scripts.proyectoId, id));
	if (!script) error(404, 'Script no encontrado');

	const filepath = path.join(UPLOADS_DIR, 'scripts', script.filename);

	let buffer: Buffer;
	try {
		buffer = await readFile(filepath);
	} catch {
		error(404, 'Archivo del script no disponible');
	}

	const ext = script.filename.toLowerCase().endsWith('.docx') ? '.docx' : '.doc';
	const contentType = MIME[ext];

	return new Response(buffer, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(script.originalName)}`
		}
	});
};
