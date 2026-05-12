import { error, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { elementos } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const proyectoId = Number(params.id);
	const elementoId = Number(params.elementoId);

	if (
		!Number.isFinite(proyectoId) ||
		proyectoId <= 0 ||
		!Number.isFinite(elementoId) ||
		elementoId <= 0
	) {
		error(400, 'ids inválidos');
	}

	const [elemento] = await db
		.select()
		.from(elementos)
		.where(and(eq(elementos.id, elementoId), eq(elementos.proyectoId, proyectoId)));

	if (!elemento) error(404, 'Elemento no encontrado');

	return { elemento };
};

export const actions: Actions = {
	updateDescripcion: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		const elementoId = Number(params.elementoId);

		if (
			!Number.isFinite(proyectoId) ||
			proyectoId <= 0 ||
			!Number.isFinite(elementoId) ||
			elementoId <= 0
		) {
			return fail(400, { error: 'ids inválidos' });
		}

		const data = await request.formData();
		const descripcion = String(data.get('descripcion') ?? '');

		await db
			.update(elementos)
			.set({ descripcion })
			.where(and(eq(elementos.id, elementoId), eq(elementos.proyectoId, proyectoId)));

		return { success: true };
	}
};
