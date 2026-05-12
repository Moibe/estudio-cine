import { error, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { escenarios } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const proyectoId = Number(params.id);
	const escenarioId = Number(params.escenarioId);

	if (
		!Number.isFinite(proyectoId) ||
		proyectoId <= 0 ||
		!Number.isFinite(escenarioId) ||
		escenarioId <= 0
	) {
		error(400, 'ids inválidos');
	}

	const [escenario] = await db
		.select()
		.from(escenarios)
		.where(and(eq(escenarios.id, escenarioId), eq(escenarios.proyectoId, proyectoId)));

	if (!escenario) error(404, 'Escenario no encontrado');

	return { escenario };
};

export const actions: Actions = {
	updateDescripcion: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		const escenarioId = Number(params.escenarioId);

		if (
			!Number.isFinite(proyectoId) ||
			proyectoId <= 0 ||
			!Number.isFinite(escenarioId) ||
			escenarioId <= 0
		) {
			return fail(400, { error: 'ids inválidos' });
		}

		const data = await request.formData();
		// La descripción puede ser vacía (significa "sin descripción"), no se valida longitud
		const descripcion = String(data.get('descripcion') ?? '');

		await db
			.update(escenarios)
			.set({ descripcion })
			.where(and(eq(escenarios.id, escenarioId), eq(escenarios.proyectoId, proyectoId)));

		return { success: true };
	}
};
