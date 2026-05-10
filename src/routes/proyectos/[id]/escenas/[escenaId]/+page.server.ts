import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	actos,
	escenarios,
	escenas,
	participaciones,
	personajes
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const proyectoId = Number(params.id);
	const escenaId = Number(params.escenaId);

	if (
		!Number.isFinite(proyectoId) ||
		proyectoId <= 0 ||
		!Number.isFinite(escenaId) ||
		escenaId <= 0
	) {
		error(400, 'ids inválidos');
	}

	const [escena] = await db
		.select({
			id: escenas.id,
			proyectoId: escenas.proyectoId,
			numero: escenas.numero,
			titulo: escenas.titulo,
			encabezado: escenas.encabezado,
			descripcion: escenas.descripcion,
			createdAt: escenas.createdAt,
			actoNumero: actos.numero,
			actoTitulo: actos.titulo,
			escenarioNombre: escenarios.nombre
		})
		.from(escenas)
		.leftJoin(actos, eq(escenas.actoId, actos.id))
		.leftJoin(escenarios, eq(escenas.escenarioId, escenarios.id))
		.where(and(eq(escenas.id, escenaId), eq(escenas.proyectoId, proyectoId)));

	if (!escena) error(404, 'Escena no encontrada');

	const cast = await db
		.select({ nombre: personajes.nombre })
		.from(escenasPersonajes)
		.innerJoin(personajes, eq(escenasPersonajes.personajeId, personajes.id))
		.where(eq(escenasPersonajes.escenaId, escenaId));

	return {
		escena: {
			...escena,
			actoNumero: escena.actoNumero ?? 1,
			actoTitulo: escena.actoTitulo ?? '',
			escenarioNombre: escena.escenarioNombre ?? '',
			personajes: cast.map((c) => c.nombre)
		}
	};
};
