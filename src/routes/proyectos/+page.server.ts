import { fail } from '@sveltejs/kit';
import { asc, desc, eq, min } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proyectos } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const items = await db
		.select()
		.from(proyectos)
		.orderBy(asc(proyectos.position), desc(proyectos.id));
	return { proyectos: items };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const titulo = String(data.get('titulo') ?? '').trim();

		if (!titulo) {
			return fail(400, { error: 'El título es requerido', titulo });
		}

		const [{ minPos }] = await db
			.select({ minPos: min(proyectos.position) })
			.from(proyectos);
		const newPos = (minPos ?? 0) - 1;

		await db.insert(proyectos).values({ titulo, position: newPos });
		return { success: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const titulo = String(data.get('titulo') ?? '').trim();

		if (!Number.isFinite(id) || id <= 0) {
			return fail(400, { error: 'id inválido' });
		}
		if (!titulo) {
			return fail(400, { error: 'El título es requerido' });
		}

		await db.update(proyectos).set({ titulo }).where(eq(proyectos.id, id));
		return { success: true };
	},

	reorder: async ({ request }) => {
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

		// better-sqlite3 transactions must be synchronous — no async callback.
		db.transaction((tx) => {
			for (let i = 0; i < ids.length; i++) {
				tx.update(proyectos).set({ position: i }).where(eq(proyectos.id, ids[i])).run();
			}
		});

		return { success: true };
	}
};
