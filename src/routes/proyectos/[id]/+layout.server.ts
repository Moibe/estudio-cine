import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	actos,
	escenarios,
	escenas,
	participaciones,
	personajes,
	proyectos
} from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) error(400, 'id inválido');

	const [proyecto] = await db.select().from(proyectos).where(eq(proyectos.id, id));
	if (!proyecto) error(404, 'Proyecto no encontrado');

	// Escenas con sus joins a actos y escenarios — todo lo que se ve en una card
	const items = await db
		.select({
			id: escenas.id,
			proyectoId: escenas.proyectoId,
			numero: escenas.numero,
			titulo: escenas.titulo,
			encabezado: escenas.encabezado,
			descripcion: escenas.descripcion,
			createdAt: escenas.createdAt,
			actoId: escenas.actoId,
			actoNumero: actos.numero,
			actoTitulo: actos.titulo,
			escenarioId: escenas.escenarioId,
			escenarioNombre: escenarios.nombre
		})
		.from(escenas)
		.leftJoin(actos, eq(escenas.actoId, actos.id))
		.leftJoin(escenarios, eq(escenas.escenarioId, escenarios.id))
		.where(eq(escenas.proyectoId, id))
		.orderBy(asc(actos.numero), asc(escenas.numero));

	// Personajes por escena (M:N): un solo query con join, agrupamos en JS
	const cast = await db
		.select({
			escenaId: participaciones.escenaId,
			personajeNombre: personajes.nombre
		})
		.from(participaciones)
		.innerJoin(personajes, eq(participaciones.personajeId, personajes.id))
		.innerJoin(escenas, eq(participaciones.escenaId, escenas.id))
		.where(eq(escenas.proyectoId, id));

	const personajesByEscena = new Map<number, string[]>();
	for (const c of cast) {
		const arr = personajesByEscena.get(c.escenaId) ?? [];
		arr.push(c.personajeNombre);
		personajesByEscena.set(c.escenaId, arr);
	}

	const escenasWithCast = items.map((e) => ({
		...e,
		actoNumero: e.actoNumero ?? 1,
		actoTitulo: e.actoTitulo ?? '',
		escenarioNombre: e.escenarioNombre ?? '',
		personajes: personajesByEscena.get(e.id) ?? []
	}));

	// Listas a nivel proyecto, útiles para las páginas /personajes y /escenarios
	const escenariosList = await db
		.select()
		.from(escenarios)
		.where(eq(escenarios.proyectoId, id))
		.orderBy(asc(escenarios.nombre));

	const personajesList = await db
		.select()
		.from(personajes)
		.where(eq(personajes.proyectoId, id))
		.orderBy(asc(personajes.nombre));

	return {
		proyecto,
		escenas: escenasWithCast,
		escenarios: escenariosList,
		personajes: personajesList
	};
};
