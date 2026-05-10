import { json, error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proyectos } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const rows = await db.select().from(proyectos).orderBy(desc(proyectos.createdAt));
	return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const titulo = body?.titulo;

	if (typeof titulo !== 'string' || titulo.trim() === '') {
		error(400, 'titulo requerido');
	}

	const [row] = await db
		.insert(proyectos)
		.values({ titulo: titulo.trim() })
		.returning();

	return json(row, { status: 201 });
};
