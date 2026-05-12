import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proyectos, scripts } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

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
	updateTitulo: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
			return fail(400, { error: 'id inválido' });
		}

		const data = await request.formData();
		const titulo = String(data.get('titulo') ?? '').trim();

		if (!titulo) {
			return fail(400, { error: 'El título es requerido' });
		}

		await db.update(proyectos).set({ titulo }).where(eq(proyectos.id, proyectoId));

		return { success: true };
	}
};
