import { error } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	actos,
	elementos,
	escenarios,
	escenas,
	participaciones,
	personajes,
	proyectos,
	scripts
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
			texto: escenas.texto,
			createdAt: escenas.createdAt,
			actoId: escenas.actoId,
			actoNumero: actos.numero,
			actoTitulo: actos.titulo,
			escenarioId: escenas.escenarioId,
			escenarioNombre: escenarios.nombre,
			escenarioFoto: escenarios.foto
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
			personajeId: personajes.id,
			personajeNombre: personajes.nombre,
			personajeFoto: personajes.foto
		})
		.from(participaciones)
		.innerJoin(personajes, eq(participaciones.personajeId, personajes.id))
		.innerJoin(escenas, eq(participaciones.escenaId, escenas.id))
		.where(eq(escenas.proyectoId, id));

	const personajesByEscena = new Map<
		number,
		Array<{ id: number; nombre: string; foto: string | null }>
	>();
	for (const c of cast) {
		const arr = personajesByEscena.get(c.escenaId) ?? [];
		arr.push({ id: c.personajeId, nombre: c.personajeNombre, foto: c.personajeFoto });
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
		.select({
			id: escenarios.id,
			proyectoId: escenarios.proyectoId,
			nombre: escenarios.nombre,
			descripcion: escenarios.descripcion,
			foto: escenarios.foto,
			createdAt: escenarios.createdAt
		})
		.from(escenarios)
		.where(eq(escenarios.proyectoId, id))
		.orderBy(asc(escenarios.position), desc(escenarios.id));

	const personajesList = await db
		.select()
		.from(personajes)
		.where(eq(personajes.proyectoId, id))
		.orderBy(asc(personajes.position), desc(personajes.id));

	const elementosList = await db
		.select()
		.from(elementos)
		.where(eq(elementos.proyectoId, id))
		.orderBy(asc(elementos.position), desc(elementos.id));

	const [script] = await db.select().from(scripts).where(eq(scripts.proyectoId, id));

	const actosList = await db
		.select({
			id: actos.id,
			numero: actos.numero,
			titulo: actos.titulo,
			duracionSegundos: actos.duracionSegundos
		})
		.from(actos)
		.where(eq(actos.proyectoId, id))
		.orderBy(asc(actos.numero));

	return {
		proyecto,
		script: script ?? null,
		actos: actosList,
		escenas: escenasWithCast,
		escenarios: escenariosList,
		personajes: personajesList,
		elementos: elementosList
	};
};
