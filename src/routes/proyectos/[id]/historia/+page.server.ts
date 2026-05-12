import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR } from '$env/static/private';
import { db } from '$lib/server/db';
import { actos, proyectos, scripts } from '$lib/server/db/schema';
import { parseDuracion } from '$lib/server/duracion';
import { getScriptExt } from '$lib/server/script-text';
import type { Actions } from './$types';

const SCRIPTS_DIR = path.join(UPLOADS_DIR, 'scripts');
const MAX_SCRIPT_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_SCRIPT_EXTS = ['.docx', '.doc', '.pdf'] as const;

export const actions: Actions = {
	updateActoDuracion: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
			return fail(400, { error: 'proyecto inválido' });
		}

		const data = await request.formData();
		const actoId = Number(data.get('actoId'));
		const raw = String(data.get('duracion') ?? '');

		if (!Number.isFinite(actoId) || actoId <= 0) {
			return fail(400, { error: 'acto inválido' });
		}

		const parsed = parseDuracion(raw);
		if (parsed === 'invalid') {
			return fail(400, { error: 'Formato no reconocido. Usa "30m", "1h 30m", "30:45" o solo minutos.' });
		}

		await db
			.update(actos)
			.set({ duracionSegundos: parsed })
			.where(and(eq(actos.id, actoId), eq(actos.proyectoId, proyectoId)));

		return { success: true };
	},

	updateProyectoDuracion: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
			return fail(400, { error: 'proyecto inválido' });
		}

		const data = await request.formData();
		const raw = String(data.get('duracion') ?? '');

		const parsed = parseDuracion(raw);
		if (parsed === 'invalid') {
			return fail(400, { error: 'Formato no reconocido. Usa "30m", "1h 30m", "30:45" o solo minutos.' });
		}

		await db
			.update(proyectos)
			.set({ duracionEstimadaSegundos: parsed })
			.where(eq(proyectos.id, proyectoId));

		return { success: true };
	},

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

		if (file.size > MAX_SCRIPT_SIZE) {
			return fail(400, {
				error: `Archivo muy grande (máx ${MAX_SCRIPT_SIZE / 1024 / 1024} MB)`
			});
		}

		const ext = getScriptExt(file.name);
		if (!ext) {
			return fail(400, { error: 'Solo archivos .docx, .doc o .pdf' });
		}

		await mkdir(SCRIPTS_DIR, { recursive: true });

		// Borra cualquier archivo previo de este proyecto, sin importar la extensión.
		for (const oldExt of VALID_SCRIPT_EXTS) {
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
