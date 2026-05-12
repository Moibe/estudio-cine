import { error, fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import {
	actos,
	escenarios,
	escenas,
	participaciones,
	personajes,
	tomas
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

// ---------------------------------------------------------------------------
// Agente de TOMAS: trabaja una sola escena a la vez con su texto verbatim.
// Independiente del agente de build (que extrae actos/escenas/personajes).
// ---------------------------------------------------------------------------

interface BuildToma {
	numero: number;
	tipoToma: string;
	composicion: string;
	encuadre: string;
	descripcion: string;
	movimientoCamara: string;
	duracionSegundos: number;
}

interface BuildTomasResult {
	tomas: BuildToma[];
}

function isBuildToma(x: unknown): x is BuildToma {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return (
		typeof o.numero === 'number' &&
		typeof o.tipoToma === 'string' &&
		typeof o.composicion === 'string' &&
		typeof o.encuadre === 'string' &&
		typeof o.descripcion === 'string' &&
		typeof o.movimientoCamara === 'string' &&
		typeof o.duracionSegundos === 'number'
	);
}

function isBuildTomasResult(x: unknown): x is BuildTomasResult {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return Array.isArray(o.tomas) && o.tomas.every(isBuildToma);
}

const ALLOWED_MODELS = [
	'gpt-4.1-nano',
	'gpt-4o-mini',
	'gpt-4.1-mini',
	'o3-mini',
	'gpt-4o',
	'gpt-4.1'
] as const;

const DEFAULT_MODEL = 'gpt-4o-mini';

type ModelId = (typeof ALLOWED_MODELS)[number];

function isAllowedModel(x: string): x is ModelId {
	return (ALLOWED_MODELS as readonly string[]).includes(x);
}

const SYSTEM_PROMPT = `You are a film director and cinematographer breaking a single scene into a shot list (lista de tomas). You will receive ONE scene from a screenplay: its slug, location, the characters present, and the FULL verbatim body of the scene. Your job is to design the camera coverage needed to shoot it.

Output a numbered list of TOMAS, each describing one camera setup. Return values in SPANISH (the user's working language is Spanish, this is the production-side output — not extracted from the script).

For each TOMA return:
- numero: sequential shot number starting at 1.
- tipoToma: el tipo de plano (shot scale) usando terminología cinematográfica en español. Responde "¿qué tan cerca/lejos está la cámara del sujeto?". Ejemplos válidos: "Plano general", "Plano abierto", "Plano medio", "Plano americano", "Plano medio corto", "Primer plano", "Primerísimo primer plano", "Plano detalle", "Plano cenital", "Plano contrapicado", "Plano subjetivo", "Over the shoulder".
- composicion: la distribución de elementos dentro del cuadro. Eje ORTOGONAL al tipoToma — un mismo tipo de plano admite distintas composiciones. Responde "¿dónde y cómo están arreglados los elementos dentro del cuadro?". Ejemplos válidos: "Centrada", "Regla de tercios", "Simétrica", "Asimétrica", "Triangular", "Diagonal", "Líneas guía", "Encuadre dentro del encuadre", "Profundidad por capas", "Espacio negativo", "Llena cuadro". Puedes combinar dos conceptos si aplica (ej. "Regla de tercios con espacio negativo"). Si el sujeto está al centro por default y no hay una decisión compositiva especial, usa "Centrada".
- encuadre: una frase corta describiendo QUÉ se ve en el cuadro (sujetos, ubicación dentro del cuadro). Ej: "REED operando la máquina CNC, JO y DENNY al fondo".
- descripcion: 1-2 oraciones describiendo qué pasa en esta toma — la acción específica que cubre, momentos clave de diálogo o reacción si aplica. Habla en presente como dirección.
- movimientoCamara: el movimiento de cámara. Opciones típicas: "Fija", "Paneo izquierda", "Paneo derecha", "Tilt arriba", "Tilt abajo", "Dolly in", "Dolly out", "Travelling lateral", "Steadicam siguiendo a X", "Handheld", "Grúa". Si es estática, "Fija".
- duracionSegundos: estimación de duración en segundos (integer). Considera el ritmo natural del momento que cubre la toma.

Lineamientos de cobertura:
- Empieza casi siempre con un MASTER (plano general o plano abierto) que establezca la escena, salvo que el contexto pida algo distinto.
- Suma planos medios y primeros planos para los beats importantes (reacciones, líneas clave de diálogo, gestos).
- Si hay diálogo entre dos personajes, considera una pareja de over-the-shoulder o singles.
- Si hay un detalle físico o prop importante en la acción, incluye un plano detalle.
- NO sobre-cubras: si la escena es corta y simple, 2-3 tomas pueden bastar. Si es larga y dramática, 6-10 tomas. NO inventes acción que no esté en el cuerpo de la escena.
- El número total de tomas debe ser proporcional al contenido real de la escena.

Devuelve SOLO el array 'tomas' bajo la raíz del JSON, sin metadata extra.`;

const SCHEMA = {
	type: 'object',
	properties: {
		tomas: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					numero: { type: 'integer' },
					tipoToma: { type: 'string' },
					composicion: { type: 'string' },
					encuadre: { type: 'string' },
					descripcion: { type: 'string' },
					movimientoCamara: { type: 'string' },
					duracionSegundos: { type: 'integer' }
				},
				required: [
					'numero',
					'tipoToma',
					'composicion',
					'encuadre',
					'descripcion',
					'movimientoCamara',
					'duracionSegundos'
				],
				additionalProperties: false
			}
		}
	},
	required: ['tomas'],
	additionalProperties: false
};

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
			texto: escenas.texto,
			createdAt: escenas.createdAt,
			actoNumero: actos.numero,
			actoTitulo: actos.titulo,
			escenarioId: escenas.escenarioId,
			escenarioNombre: escenarios.nombre
		})
		.from(escenas)
		.leftJoin(actos, eq(escenas.actoId, actos.id))
		.leftJoin(escenarios, eq(escenas.escenarioId, escenarios.id))
		.where(and(eq(escenas.id, escenaId), eq(escenas.proyectoId, proyectoId)));

	if (!escena) error(404, 'Escena no encontrada');

	const cast = await db
		.select({ id: personajes.id, nombre: personajes.nombre })
		.from(participaciones)
		.innerJoin(personajes, eq(participaciones.personajeId, personajes.id))
		.where(eq(participaciones.escenaId, escenaId));

	const tomasList = await db
		.select()
		.from(tomas)
		.where(eq(tomas.escenaId, escenaId))
		.orderBy(asc(tomas.position), asc(tomas.numero));

	return {
		escena: {
			...escena,
			actoNumero: escena.actoNumero ?? 1,
			actoTitulo: escena.actoTitulo ?? '',
			escenarioNombre: escena.escenarioNombre ?? '',
			personajes: cast
		},
		tomas: tomasList
	};
};

export const actions: Actions = {
	buildTomas: async ({ params, request }) => {
		const apiKey = env.OPENAI_API_KEY;
		if (!apiKey) {
			return fail(500, { error: 'OPENAI_API_KEY no configurada en .env' });
		}

		const proyectoId = Number(params.id);
		const escenaId = Number(params.escenaId);

		if (
			!Number.isFinite(proyectoId) ||
			proyectoId <= 0 ||
			!Number.isFinite(escenaId) ||
			escenaId <= 0
		) {
			return fail(400, { error: 'ids inválidos' });
		}

		const formData = await request.formData();
		const requested = String(formData.get('model') ?? DEFAULT_MODEL);
		const model: ModelId = isAllowedModel(requested) ? requested : DEFAULT_MODEL;

		// Cargamos la escena (con joins a escenario + personajes) para pasarle todo
		// el contexto al agente. Sin texto, no podemos pedir tomas.
		const [escena] = await db
			.select({
				id: escenas.id,
				numero: escenas.numero,
				titulo: escenas.titulo,
				encabezado: escenas.encabezado,
				texto: escenas.texto,
				escenarioNombre: escenarios.nombre
			})
			.from(escenas)
			.leftJoin(escenarios, eq(escenas.escenarioId, escenarios.id))
			.where(and(eq(escenas.id, escenaId), eq(escenas.proyectoId, proyectoId)));

		if (!escena) return fail(404, { error: 'Escena no encontrada' });

		if (!escena.texto.trim()) {
			return fail(400, {
				error:
					'Esta escena no tiene texto verbatim. Reprocesa el script primero para extraerlo.'
			});
		}

		const cast = await db
			.select({ nombre: personajes.nombre })
			.from(participaciones)
			.innerJoin(personajes, eq(participaciones.personajeId, personajes.id))
			.where(eq(participaciones.escenaId, escenaId));

		const userMessage = [
			`ESCENA ${escena.numero}${escena.titulo ? `: ${escena.titulo}` : ''}`,
			`SLUG: ${escena.encabezado}`,
			escena.escenarioNombre ? `ESCENARIO: ${escena.escenarioNombre}` : '',
			cast.length > 0
				? `PERSONAJES PRESENTES: ${cast.map((c) => c.nombre).join(', ')}`
				: '',
			'',
			'CUERPO DE LA ESCENA:',
			escena.texto
		]
			.filter((l) => l.length > 0)
			.join('\n');

		let openaiResponse: Response;
		try {
			openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					model,
					messages: [
						{ role: 'system', content: SYSTEM_PROMPT },
						{ role: 'user', content: userMessage }
					],
					response_format: {
						type: 'json_schema',
						json_schema: { name: 'tomas_breakdown', schema: SCHEMA, strict: true }
					}
				})
			});
		} catch (e) {
			return fail(502, {
				error: `No se pudo conectar a OpenAI: ${e instanceof Error ? e.message : 'error de red'}`
			});
		}

		if (!openaiResponse.ok) {
			const txt = await openaiResponse.text();
			return fail(502, {
				error: `OpenAI ${openaiResponse.status}: ${txt.slice(0, 300)}`
			});
		}

		const data = await openaiResponse.json();
		const content: string | undefined = data.choices?.[0]?.message?.content;
		if (!content) return fail(502, { error: 'OpenAI no regresó contenido' });

		let parsed: unknown;
		try {
			parsed = JSON.parse(content);
		} catch {
			return fail(502, { error: 'OpenAI regresó JSON inválido' });
		}

		if (!isBuildTomasResult(parsed)) {
			return fail(502, { error: 'JSON no respeta el schema esperado' });
		}

		// Persistencia: wipe de tomas source='ai' de esta escena, luego insert.
		// Las tomas manuales se conservan intactas.
		db.transaction((tx) => {
			tx.delete(tomas)
				.where(and(eq(tomas.escenaId, escenaId), eq(tomas.source, 'ai')))
				.run();

			for (let i = 0; i < parsed.tomas.length; i++) {
				const t = parsed.tomas[i];
				tx.insert(tomas)
					.values({
						escenaId,
						numero: t.numero,
						tipoToma: t.tipoToma,
						composicion: t.composicion,
						encuadre: t.encuadre,
						descripcion: t.descripcion,
						movimientoCamara: t.movimientoCamara,
						duracionSegundos: t.duracionSegundos,
						source: 'ai',
						position: i
					})
					.run();
			}
		});

		return { success: true, count: parsed.tomas.length };
	}
};
