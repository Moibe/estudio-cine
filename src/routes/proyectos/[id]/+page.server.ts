import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR } from '$env/static/private';
import { db } from '$lib/server/db';
import { proyectos, scripts } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const SCRIPTS_DIR = path.join(UPLOADS_DIR, 'scripts');
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_EXTS = ['.docx', '.doc'] as const;

function getExt(filename: string): '.docx' | '.doc' | null {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.docx')) return '.docx';
	if (lower.endsWith('.doc')) return '.doc';
	return null;
}

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		error(400, 'id inválido');
	}

	const [proyecto] = await db.select().from(proyectos).where(eq(proyectos.id, id));
	if (!proyecto) {
		error(404, 'Proyecto no encontrado');
	}

	const [script] = await db.select().from(scripts).where(eq(scripts.proyectoId, id));

	return { proyecto, script: script ?? null };
};

export const actions: Actions = {
	uploadScript: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
			return fail(400, { error: 'id inválido' });
		}

		const data = await request.formData();
		const file = data.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Selecciona un archivo' });
		}

		if (file.size > MAX_SIZE) {
			return fail(400, { error: `Archivo muy grande (máx ${MAX_SIZE / 1024 / 1024} MB)` });
		}

		const ext = getExt(file.name);
		if (!ext) {
			return fail(400, { error: 'Solo archivos .docx o .doc' });
		}

		await mkdir(SCRIPTS_DIR, { recursive: true });

		// Delete any previous script files for this project (regardless of ext)
		for (const oldExt of VALID_EXTS) {
			await unlink(path.join(SCRIPTS_DIR, `${proyectoId}${oldExt}`)).catch(() => {});
		}

		const filename = `${proyectoId}${ext}`;
		const filepath = path.join(SCRIPTS_DIR, filename);
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filepath, buffer);

		await db
			.insert(scripts)
			.values({
				proyectoId,
				filename,
				originalName: file.name,
				size: file.size
			})
			.onConflictDoUpdate({
				target: scripts.proyectoId,
				set: {
					filename,
					originalName: file.name,
					size: file.size,
					uploadedAt: new Date()
				}
			});

		return { success: true };
	}
};
