import { fail } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proyectos } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const items = await db.select().from(proyectos).orderBy(desc(proyectos.createdAt));
	return { proyectos: items };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const titulo = String(data.get('titulo') ?? '').trim();

		if (!titulo) {
			return fail(400, { error: 'El título es requerido', titulo });
		}

		await db.insert(proyectos).values({ titulo });
		return { success: true };
	}
};
