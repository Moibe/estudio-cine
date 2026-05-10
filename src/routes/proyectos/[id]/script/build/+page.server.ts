import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { env } from '$env/dynamic/private';
import { UPLOADS_DIR } from '$env/static/private';
import { db } from '$lib/server/db';
import {
	actos,
	escenarios,
	escenas,
	participaciones,
	personajes,
	proyectos,
	scripts
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

interface BuildEscena {
	numero: number;
	titulo: string;
	especificacion: string;
	escenario: string;
	descripcion: string;
	personajes: string[];
}

interface BuildActo {
	numero: number;
	titulo: string;
	escenas: BuildEscena[];
}

interface BuildResult {
	titulo: string;
	actos: BuildActo[];
}

function isBuildEscena(x: unknown): x is BuildEscena {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return (
		typeof o.numero === 'number' &&
		typeof o.titulo === 'string' &&
		typeof o.especificacion === 'string' &&
		typeof o.escenario === 'string' &&
		typeof o.descripcion === 'string' &&
		Array.isArray(o.personajes)
	);
}

function isBuildActo(x: unknown): x is BuildActo {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return (
		typeof o.numero === 'number' &&
		typeof o.titulo === 'string' &&
		Array.isArray(o.escenas) &&
		o.escenas.every(isBuildEscena)
	);
}

function isBuildResult(x: unknown): x is BuildResult {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	if (typeof o.titulo !== 'string' || !Array.isArray(o.actos)) return false;
	return o.actos.every(isBuildActo);
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

const SYSTEM_PROMPT = `You are a screenplay analysis expert. Given the raw text of a screenplay (in Spanish or English), detect its hierarchical structure: a screenplay is divided into ACTS (actos), and each act contains multiple SCENES (escenas).

Return the structure with this hierarchy: titulo (screenplay title) → actos[] → each acto contains escenas[].

For each ACTO return:
- numero: sequential act number starting at 1 (1, 2, 3, ...).
- titulo: the act's title or label as it appears in the source. Common formats: "ACTO I", "ACT ONE", "PRIMER ACTO", "Act 1", "ACTO PRIMERO", etc. Use the ORIGINAL LANGUAGE and capitalization from the source. If the act has no descriptive subtitle, just use the basic label (e.g. "ACTO I").
DETECTION:
- If the source script has EXPLICIT act divisions (clearly labeled as "ACTO", "ACT", "PARTE", or similar headings), detect them and use them.
- If the source script does NOT have explicit act divisions, return ALL scenes inside a single acto with numero=1 and titulo="" (empty string). Do NOT invent fake act boundaries based on plot structure when none are marked in the source.

For each ESCENA inside an acto return:
- numero: GLOBAL sequential scene number starting at 1, CONTINUOUS across all acts. If Acto I ends with scene 7, Acto II starts with scene 8 (NOT scene 1). This is critical — never restart numbering inside each act.
- titulo: a SHORT, friendly nickname for the scene (2-5 words).
  PRIMARY RULE: if the source script already has a descriptive title for the scene (for example a phrase or label appearing near the scene heading, right after the slug or right before the action — often in bold, all caps, or visually distinct from the body), USE THAT TITLE verbatim, in its ORIGINAL LANGUAGE (only minor cleanup like fixing capitalization). Do NOT translate a title that exists in the source. If the script is in English and the scene title is "The Cut", keep it "The Cut" — do not translate to "El Corte". Same for any other source language: preserve as-is.
  FALLBACK: only if the source script does not include any descriptive title for that scene, invent one yourself in 2-5 evocative words in Spanish. Examples for invented titles: "La plática", "La empresa", "Los cálculos", "El primer encuentro", "La discusión".
  NEVER include "Escena", scene numbering, or the location/time slug in titulo. NEVER duplicate the especificacion field.
- especificacion: ONLY the scene's location/time slug (technical specification). Never include the word "Escena", "ESCENA", "Scene", "SCENE", a scene number, or any leading prefix like "Escena 1 -" or "Scene 5:". The numero field already carries the number, so repeating it here is redundant. Examples of correct values: "INT. CASA DE JUAN - NOCHE", "EXT. CARRETERA - DÍA", "INT. OFICINA - AMANECER". If the source script's slug includes numbering or the word "escena", strip that out and keep only the location/time portion. If no formal slug exists, write one in the same INT./EXT. format from the action description.
- escenario: the CANONICAL, deduplicable name of the location (without INT/EXT prefix and without time-of-day suffix). The same physical place across different scenes MUST share the EXACT same escenario string, regardless of variations in the slug. Example: "Casa de Juan" — used for both an "INT. CASA DE JUAN - DÍA" scene and an "INT. CASA DE JUAN - NOCHE" scene (both happen at the same place "Casa de Juan", just at different times). Another example: "Planta de fabricación" used for "INT. PLANTA DE FABRICACIÓN - DÍA" and "INT. PLANTA DE FABRICACIÓN - MAÑANA". Use the same capitalization scheme consistently. NEVER include INT/EXT prefix, time suffix, or any technical qualifier — just the location's name as you would name it in a conversation.
- descripcion: a 1-2 sentence summary in Spanish describing the scene's action and tone.
- personajes: array of distinct character names that appear or speak in the scene. Use ALL CAPS as in screenplay convention.

At the top level also return:
- titulo: the screenplay title if you can infer it from the text; otherwise empty string.

Be exhaustive: capture every act and every scene in the script, including short ones. Do not invent acts or scenes that are not in the text.`;

const SCHEMA = {
	type: 'object',
	properties: {
		titulo: { type: 'string' },
		actos: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					numero: { type: 'integer' },
					titulo: { type: 'string' },
					escenas: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								numero: { type: 'integer' },
								titulo: { type: 'string' },
								especificacion: { type: 'string' },
								escenario: { type: 'string' },
								descripcion: { type: 'string' },
								personajes: { type: 'array', items: { type: 'string' } }
							},
							required: [
								'numero',
								'titulo',
								'especificacion',
								'escenario',
								'descripcion',
								'personajes'
							],
							additionalProperties: false
						}
					}
				},
				required: ['numero', 'titulo', 'escenas'],
				additionalProperties: false
			}
		}
	},
	required: ['titulo', 'actos'],
	additionalProperties: false
};

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) error(400, 'id inválido');

	const [proyecto] = await db.select().from(proyectos).where(eq(proyectos.id, id));
	if (!proyecto) error(404, 'Proyecto no encontrado');

	const [script] = await db.select().from(scripts).where(eq(scripts.proyectoId, id));
	if (!script) error(404, 'No hay script subido para este proyecto');

	return { proyecto, script };
};

export const actions: Actions = {
	build: async ({ params, request }) => {
		const apiKey = env.OPENAI_API_KEY;
		if (!apiKey) {
			return fail(500, { error: 'OPENAI_API_KEY no configurada en .env' });
		}

		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) {
			return fail(400, { error: 'id inválido' });
		}

		const formData = await request.formData();
		const requested = String(formData.get('model') ?? DEFAULT_MODEL);
		const model: ModelId = isAllowedModel(requested) ? requested : DEFAULT_MODEL;

		const [script] = await db.select().from(scripts).where(eq(scripts.proyectoId, id));
		if (!script) return fail(404, { error: 'Script no encontrado' });

		const filepath = path.join(UPLOADS_DIR, 'scripts', script.filename);
		let buffer: Buffer;
		try {
			buffer = await readFile(filepath);
		} catch {
			return fail(404, { error: 'Archivo del script no disponible en disco' });
		}

		const { value: text } = await mammoth.extractRawText({ buffer });
		if (!text.trim()) {
			return fail(400, { error: 'El script está vacío' });
		}

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
						{ role: 'user', content: text }
					],
					response_format: {
						type: 'json_schema',
						json_schema: { name: 'script_analysis', schema: SCHEMA, strict: true }
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

		if (!isBuildResult(parsed)) {
			return fail(502, { error: 'JSON no respeta el schema esperado' });
		}

		// Persist: replace the entire normalized hierarchy for this project.
		// Order: delete escenas (cascades to escenas_personajes) → delete actos →
		// delete escenarios → delete personajes → re-insert all from parsed result.
		// better-sqlite3 transactions must be synchronous — no async callback.

		// Pre-compute distinct escenario nombres and personaje nombres to dedupe.
		const allEscenas = parsed.actos.flatMap((a) => a.escenas);
		const escenarioNombres = Array.from(new Set(allEscenas.map((e) => e.escenario))).filter(
			(n) => n.length > 0
		);
		const personajeNombres = Array.from(
			new Set(allEscenas.flatMap((e) => e.personajes))
		).filter((n) => n.length > 0);

		db.transaction((tx) => {
			// Wipe project's prior data (escenas first because of FK; then parents)
			tx.delete(escenas).where(eq(escenas.proyectoId, id)).run();
			tx.delete(actos).where(eq(actos.proyectoId, id)).run();
			tx.delete(escenarios).where(eq(escenarios.proyectoId, id)).run();
			tx.delete(personajes).where(eq(personajes.proyectoId, id)).run();

			// Insert escenarios — collect ids for FK lookups
			const escenarioIdByNombre = new Map<string, number>();
			for (const nombre of escenarioNombres) {
				const [row] = tx
					.insert(escenarios)
					.values({ proyectoId: id, nombre })
					.returning({ id: escenarios.id })
					.all();
				escenarioIdByNombre.set(nombre, row.id);
			}

			// Insert personajes — collect ids for join inserts
			const personajeIdByNombre = new Map<string, number>();
			for (const nombre of personajeNombres) {
				const [row] = tx
					.insert(personajes)
					.values({ proyectoId: id, nombre })
					.returning({ id: personajes.id })
					.all();
				personajeIdByNombre.set(nombre, row.id);
			}

			// Insert actos and their escenas (with FK to acto + escenario), then join rows
			for (const acto of parsed.actos) {
				const [actoRow] = tx
					.insert(actos)
					.values({ proyectoId: id, numero: acto.numero, titulo: acto.titulo })
					.returning({ id: actos.id })
					.all();

				for (const escena of acto.escenas) {
					const escenarioId = escenarioIdByNombre.get(escena.escenario) ?? null;
					const [escenaRow] = tx
						.insert(escenas)
						.values({
							proyectoId: id,
							actoId: actoRow.id,
							escenarioId,
							numero: escena.numero,
							titulo: escena.titulo,
							encabezado: escena.especificacion,
							descripcion: escena.descripcion,
							personajes: escena.personajes,
							actoNumero: acto.numero,
							actoTitulo: acto.titulo
						})
						.returning({ id: escenas.id })
						.all();

					// Participaciones (M:N) — el personaje aparece en esta escena
					for (const nombre of escena.personajes) {
						const personajeId = personajeIdByNombre.get(nombre);
						if (personajeId === undefined) continue;
						tx.insert(participaciones)
							.values({ escenaId: escenaRow.id, personajeId })
							.run();
					}
				}
			}
		});

		return { success: true, result: parsed };
	}
};
