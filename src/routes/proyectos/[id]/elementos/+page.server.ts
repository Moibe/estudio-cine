import { fail } from '@sveltejs/kit';
import { and, eq, min } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { elementos } from '$lib/server/db/schema';
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
			.select({ minPos: min(elementos.position) })
			.from(elementos)
			.where(eq(elementos.proyectoId, proyectoId));
		const newPos = (minPos ?? 0) - 1;

		try {
			await db.insert(elementos).values({ proyectoId, nombre, source: 'manual', position: newPos });
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'error';
			if (msg.includes('UNIQUE') || msg.includes('unique')) {
				return fail(400, { error: 'Ya existe un elemento con ese nombre en este proyecto' });
			}
			return fail(500, { error: 'No se pudo crear el elemento' });
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
				tx.update(elementos)
					.set({ position: i })
					.where(and(eq(elementos.id, ids[i]), eq(elementos.proyectoId, proyectoId)))
					.run();
			}
		});

		return { success: true };
	}
};
