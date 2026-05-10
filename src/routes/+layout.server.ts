import { asc, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proyectos } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const items = await db
		.select({ id: proyectos.id, titulo: proyectos.titulo })
		.from(proyectos)
		.orderBy(asc(proyectos.position), desc(proyectos.id));

	return { proyectos: items };
};
