import { fail } from '@sveltejs/kit';
import { and, eq, min } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { escenarios } from '$lib/server/db/schema';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
			return fail(400, { error: 'proyecto inválido' });
		}

		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();

		if (!nombre) {
			return fail(400, { error: 'El nombre es requerido' });
		}

		const [{ minPos }] = await db
			.select({ minPos: min(escenarios.position) })
			.from(escenarios)
			.where(eq(escenarios.proyectoId, proyectoId));
		const newPos = (minPos ?? 0) - 1;

		try {
			await db
				.insert(escenarios)
				.values({ proyectoId, nombre, source: 'manual', position: newPos });
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'error';
			if (msg.includes('UNIQUE') || msg.includes('unique')) {
				return fail(400, { error: 'Ya existe un escenario con ese nombre en este proyecto' });
			}
			return fail(500, { error: 'No se pudo crear el escenario' });
		}

		return { success: true };
	},

	updateNombre: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
			return fail(400, { error: 'proyecto inválido' });
		}

		const data = await request.formData();
		const id = Number(data.get('id'));
		const nombre = String(data.get('nombre') ?? '').trim();

		if (!Number.isFinite(id) || id <= 0) {
			return fail(400, { error: 'id inválido' });
		}
		if (!nombre) {
			return fail(400, { error: 'El nombre es requerido' });
		}

		try {
			await db
				.update(escenarios)
				.set({ nombre })
				.where(and(eq(escenarios.id, id), eq(escenarios.proyectoId, proyectoId)));
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'error';
			if (msg.includes('UNIQUE') || msg.includes('unique')) {
				return fail(400, { error: 'Ya existe un escenario con ese nombre en este proyecto' });
			}
			return fail(500, { error: 'No se pudo actualizar el escenario' });
		}

		return { success: true };
	},

	reorder: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
			return fail(400, { error: 'proyecto inválido' });
		}

		const data = await request.formData();
		const raw = String(data.get('ids') ?? '[]');

		let ids: number[];
		try {
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed) || !parsed.every((n) => Number.isInteger(n) && n > 0)) {
				return fail(400, { error: 'ids inválido' });
			}
			ids = parsed;
		} catch {
			return fail(400, { error: 'ids no es JSON válido' });
		}

		db.transaction((tx) => {
			for (let i = 0; i < ids.length; i++) {
				tx.update(escenarios)
					.set({ position: i })
					.where(and(eq(escenarios.id, ids[i]), eq(escenarios.proyectoId, proyectoId)))
					.run();
			}
		});

		return { success: true };
	}
};
