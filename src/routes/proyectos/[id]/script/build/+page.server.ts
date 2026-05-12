import { error, fail } from '@sveltejs/kit';
import { and, desc, eq, inArray, min, notInArray } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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
	scriptBuilds,
	scripts
} from '$lib/server/db/schema';
import { extractScriptText, getScriptExt } from '$lib/server/script-text';
import type { Actions, PageServerLoad } from './$types';

interface BuildEscena {
	numero: number;
	titulo: string;
	especificacion: string;
	escenario: string;
	descripcion: string;
	texto: string;
	personajes: string[];
}

interface BuildActo {
	numero: number;
	titulo: string;
	duracionEstimadaSegundos: number;
	escenas: BuildEscena[];
}

interface BuildEscenarioInfo {
	nombre: string;
	descripcion: string;
}

interface BuildPersonajeInfo {
	nombre: string;
	descripcion: string;
}

interface BuildResult {
	titulo: string;
	duracionEstimadaSegundos: number;
	escenarios: BuildEscenarioInfo[];
	personajes: BuildPersonajeInfo[];
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
		typeof o.texto === 'string' &&
		Array.isArray(o.personajes)
	);
}

function isBuildActo(x: unknown): x is BuildActo {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return (
		typeof o.numero === 'number' &&
		typeof o.titulo === 'string' &&
		typeof o.duracionEstimadaSegundos === 'number' &&
		Array.isArray(o.escenas) &&
		o.escenas.every(isBuildEscena)
	);
}

function isBuildEscenarioInfo(x: unknown): x is BuildEscenarioInfo {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return typeof o.nombre === 'string' && typeof o.descripcion === 'string';
}

function isBuildPersonajeInfo(x: unknown): x is BuildPersonajeInfo {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return typeof o.nombre === 'string' && typeof o.descripcion === 'string';
}

function isBuildResult(x: unknown): x is BuildResult {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	if (
		typeof o.titulo !== 'string' ||
		typeof o.duracionEstimadaSegundos !== 'number' ||
		!Array.isArray(o.actos) ||
		!Array.isArray(o.escenarios) ||
		!Array.isArray(o.personajes)
	) {
		return false;
	}
	if (!o.escenarios.every(isBuildEscenarioInfo)) return false;
	if (!o.personajes.every(isBuildPersonajeInfo)) return false;
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

GLOBAL RULE — ORIGINAL LANGUAGE: Any data you EXTRACT from the script (titles, names, slugs, descriptions, character intros, location descriptions, etc.) must be returned VERBATIM in the script's ORIGINAL LANGUAGE. Never translate, paraphrase, or normalize extracted text. If the script is in English, extracted strings are in English; if it's in Spanish, in Spanish; if mixed, preserve each piece as written. The ONLY exceptions are fields that you INVENT yourself when the source has no equivalent — those are explicitly called out below (e.g. the invented fallback titulo for an unnamed scene, or the synthesized scene descripcion summary). Everything else: copy as-is.

TRADITIONAL SCREENPLAY FORMAT — NORMALIZATION:
The script may follow industry-standard formatting (Final Draft / Hollywood / spec script). Before extracting data, apply the following normalization. This is structural cleanup, NOT translation — the resulting canonical strings still respect the GLOBAL RULE above (e.g., a personaje's bare name stays in its original language).

1. CHARACTER CUE MODIFIERS — when a character heading carries parenthetical annotations, strip them and return only the bare ALL-CAPS name. Common modifiers to remove:
   - English: (V.O.), (VO), (O.S.), (OS), (O.C.), (CONT'D), (CONTD), (CONT.), (BEAT), (PAUSE), (PRE-LAP), (FILTER), (ON PHONE), (INTO PHONE), (TO <X>), (WHISPERING), (SHOUTING), and any other parenthetical adverbial.
   - Spanish: (F.C.), (FUERA DE CUADRO), (FUERA DE CAMPO), (CONTINÚA), (CONT.), (SUSURRANDO), (AL TELÉFONO), (GRITANDO), (AL <X>).
   - Examples: "JOHN (V.O.)" → personaje = "JOHN"; "MARÍA (CONT'D)" → personaje = "MARÍA"; "DETECTIVE (O.S.)" → personaje = "DETECTIVE".

2. LINES TO IGNORE — never treat any of the following as a scene heading, act heading, scene title, character name, or part of a descripcion:
   - Transitions (English): "CUT TO:", "FADE IN:", "FADE OUT.", "FADE TO BLACK.", "DISSOLVE TO:", "SMASH CUT TO:", "MATCH CUT TO:", "JUMP CUT TO:", "INTERCUT:", "BACK TO SCENE:".
   - Transitions (Spanish): "CORTE A:", "FUNDE A:", "FUNDIDO A:", "FUNDIDO A NEGRO.", "DISUELVE A:", "CORTE DIRECTO:".
   - Layout markers: "TITLE CARD:", "TITLE:", "SUPER:", "INSERT:", "ON SCREEN:", "TEXT ON SCREEN:", "TÍTULO:", "INSERTO:", "EN PANTALLA:".
   - Page-break artifacts: "CONTINUED:", "(CONTINUED)", "CONTINÚA:", "MORE", "(MORE)", page numbers, page headers/footers, "End of Act X" / "Fin del Acto X" trailers (these MAY inform act boundaries but never appear verbatim in output strings).

3. MINI-SLUGS / CONTINUOUS-ACTION HEADINGS — short standalone headings like "LATER", "MOMENTS LATER", "CONTINUOUS", "SAME TIME", "BACK TO THE OFFICE", "MÁS TARDE", "MOMENTOS DESPUÉS", "CONTINUO", "AL MISMO TIEMPO", "VOLVEMOS A LA OFICINA" indicate the same location continuing or returning. Do NOT count these as new escenas — fold their action under the most recent full INT./EXT. slug. They may be referenced inside that escena's descripcion if narratively relevant.

4. SLUG VARIATIONS — recognize all of these as full scene headings:
   - Prefixes: "INT.", "EXT.", "INT./EXT.", "I/E", "INTERIOR.", "EXTERIOR.", "INTERIOR/EXTERIOR."
   - Time-of-day suffixes (English): "DAY", "NIGHT", "DAWN", "DUSK", "MORNING", "AFTERNOON", "EVENING", "LATER", "CONTINUOUS", "MOMENTS LATER".
   - Time-of-day suffixes (Spanish): "DÍA", "NOCHE", "AMANECER", "ATARDECER", "MAÑANA", "TARDE", "MADRUGADA".
   When deriving the canonical "escenario" (location), strip BOTH the prefix and the time-of-day suffix regardless of language — only the bare location name remains.

Return the structure with this hierarchy: titulo (screenplay title) → actos[] → each acto contains escenas[].

For each ACTO return:
- numero: sequential act number starting at 1 (1, 2, 3, ...).
- titulo: the act's title or label as it appears in the source. Common formats: "ACTO I", "ACT ONE", "PRIMER ACTO", "Act 1", "ACTO PRIMERO", etc. Use the ORIGINAL LANGUAGE and capitalization from the source. If the act has no descriptive subtitle, just use the basic label (e.g. "ACTO I").
- duracionEstimadaSegundos: estimación de la duración total del acto en segundos (integer). Apóyate en la convención "1 página de guión ≈ 1 minuto de pantalla", ajustando por densidad de acción vs. diálogo (acción visual extensa tiende a estirar; diálogo rápido tiende a comprimir). Si el script tiene UN solo acto (no hay divisiones explícitas), este número será igual a la duración total estimada del proyecto.
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
- texto: the FULL VERBATIM body of the scene as written in the source script — every action line, every character cue, every parenthetical, every line of dialogue, every transition INSIDE this scene. Preserve line breaks between blocks (use \\n). Do NOT include the scene heading/slug itself (that already lives in 'especificacion'). Do NOT include the next scene's slug or anything after it. Do NOT include continuation markers like "(CONTINUED)" or "MORE" that are pure layout artifacts (per the normalization rules above). Do NOT translate, paraphrase, summarize, or abbreviate — copy character-for-character in the ORIGINAL LANGUAGE. This is the only field that holds the actual screenplay content; if the script is in English, this field is in English; if Spanish, Spanish. If you cannot identify any body for the scene (rare — e.g. just a slug with no following action), return an empty string "".
- personajes: array of distinct character names that appear or speak in the scene. Use ALL CAPS as in screenplay convention.

At the top level also return:
- titulo: the screenplay title if you can infer it from the text; otherwise empty string.
- duracionEstimadaSegundos: estimación de la duración total del proyecto en segundos (integer). Debería ser aproximadamente igual a la suma de las duraciones por acto. Usa la regla "1 página ≈ 1 minuto" ajustada por la densidad real del contenido (mucha acción visual estira el tiempo, diálogo veloz lo comprime).
- escenarios: an array describing every unique location used by the scenes. Each entry has:
  - nombre: the SAME canonical name used in each scene's "escenario" field. Must match exactly so the link can be made.
  - descripcion: a VERBATIM description of the location extracted from the screenplay if one exists. Screenplays sometimes describe locations explicitly in action lines (often in the first paragraph after a slug, or in a dedicated paragraph that describes the space itself). Copy that description EXACTLY as written, in its ORIGINAL LANGUAGE, with no paraphrasing, summarizing, or invention. If the screenplay does NOT describe this location (it's just referenced by name without elaboration), return descripcion as an empty string "". Do not infer or invent — be strict: only copy real descriptive text from the source.
- personajes: an array describing every unique character that appears across the scenes. Each entry has:
  - nombre: the SAME ALL-CAPS character name used in each scene's "personajes" field. Must match exactly so the link can be made.
  - descripcion: a VERBATIM description of the character extracted from the screenplay if one exists. Screenplays often introduce characters with a short description the FIRST time they appear (e.g., "JUAN (40), exhausted but determined." or a dedicated paragraph describing their look, age, or vibe). Copy that descriptive text EXACTLY as written, in its ORIGINAL LANGUAGE, with no paraphrasing, summarizing, or invention. If the script does NOT describe this character (they're just named without elaboration), return descripcion as an empty string "". Do not infer or invent — be strict: only copy real descriptive text from the source.

Be exhaustive: capture every act and every scene in the script, including short ones. Do not invent acts or scenes that are not in the text.`;

const SCHEMA = {
	type: 'object',
	properties: {
		titulo: { type: 'string' },
		duracionEstimadaSegundos: { type: 'integer' },
		escenarios: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					nombre: { type: 'string' },
					descripcion: { type: 'string' }
				},
				required: ['nombre', 'descripcion'],
				additionalProperties: false
			}
		},
		personajes: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					nombre: { type: 'string' },
					descripcion: { type: 'string' }
				},
				required: ['nombre', 'descripcion'],
				additionalProperties: false
			}
		},
		actos: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					numero: { type: 'integer' },
					titulo: { type: 'string' },
					duracionEstimadaSegundos: { type: 'integer' },
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
								texto: { type: 'string' },
								personajes: { type: 'array', items: { type: 'string' } }
							},
							required: [
								'numero',
								'titulo',
								'especificacion',
								'escenario',
								'descripcion',
								'texto',
								'personajes'
							],
							additionalProperties: false
						}
					}
				},
				required: ['numero', 'titulo', 'duracionEstimadaSegundos', 'escenas'],
				additionalProperties: false
			}
		}
	},
	required: ['titulo', 'duracionEstimadaSegundos', 'escenarios', 'personajes', 'actos'],
	additionalProperties: false
};

export const load: PageServerLoad = async ({ params, url }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) error(400, 'id inválido');

	const [proyecto] = await db.select().from(proyectos).where(eq(proyectos.id, id));
	if (!proyecto) error(404, 'Proyecto no encontrado');

	const [script] = await db.select().from(scripts).where(eq(scripts.proyectoId, id));

	const builds = await db
		.select({
			id: scriptBuilds.id,
			model: scriptBuilds.model,
			restoredFromId: scriptBuilds.restoredFromId,
			createdAt: scriptBuilds.createdAt
		})
		.from(scriptBuilds)
		.where(eq(scriptBuilds.proyectoId, id))
		.orderBy(desc(scriptBuilds.createdAt), desc(scriptBuilds.id));

	const viewingIdRaw = url.searchParams.get('v');
	const viewingId = viewingIdRaw !== null ? Number(viewingIdRaw) : null;

	let viewingBuild: {
		id: number;
		model: string;
		restoredFromId: number | null;
		createdAt: Date;
		json: unknown;
	} | null = null;
	let diff: BuildDiff | null = null;

	if (viewingId !== null && Number.isFinite(viewingId) && viewingId > 0) {
		const [row] = await db
			.select()
			.from(scriptBuilds)
			.where(and(eq(scriptBuilds.id, viewingId), eq(scriptBuilds.proyectoId, id)));
		if (row) {
			let parsedJson: unknown = null;
			try {
				parsedJson = JSON.parse(row.json);
			} catch {
				parsedJson = null;
			}
			viewingBuild = {
				id: row.id,
				model: row.model,
				restoredFromId: row.restoredFromId,
				createdAt: row.createdAt,
				json: parsedJson
			};

			// Diff: comparar la versión que se está viendo contra la más reciente (la actual).
			if (builds.length > 0 && builds[0].id !== row.id && isBuildResult(parsedJson)) {
				const [latestRow] = await db
					.select({ json: scriptBuilds.json })
					.from(scriptBuilds)
					.where(eq(scriptBuilds.id, builds[0].id));
				if (latestRow) {
					let latestParsed: unknown = null;
					try {
						latestParsed = JSON.parse(latestRow.json);
					} catch {
						latestParsed = null;
					}
					if (isBuildResult(latestParsed)) {
						diff = computeBuildDiff(parsedJson, latestParsed);
					}
				}
			}
		}
	}

	return { proyecto, script: script ?? null, builds, viewingBuild, diff };
};

type BuildDiff = {
	personajes: { added: string[]; removed: string[] };
	escenarios: { added: string[]; removed: string[] };
	actos: { viewing: number; actual: number };
	escenas: { viewing: number; actual: number };
};

function computeBuildDiff(viewing: BuildResult, actual: BuildResult): BuildDiff {
	const viewingPersonajes = new Set(viewing.personajes.map((p) => p.nombre));
	const actualPersonajes = new Set(actual.personajes.map((p) => p.nombre));
	const viewingEscenarios = new Set(viewing.escenarios.map((e) => e.nombre));
	const actualEscenarios = new Set(actual.escenarios.map((e) => e.nombre));

	const viewingEscenasCount = viewing.actos.reduce((acc, a) => acc + a.escenas.length, 0);
	const actualEscenasCount = actual.actos.reduce((acc, a) => acc + a.escenas.length, 0);

	return {
		personajes: {
			added: [...actualPersonajes].filter((n) => !viewingPersonajes.has(n)),
			removed: [...viewingPersonajes].filter((n) => !actualPersonajes.has(n))
		},
		escenarios: {
			added: [...actualEscenarios].filter((n) => !viewingEscenarios.has(n)),
			removed: [...viewingEscenarios].filter((n) => !actualEscenarios.has(n))
		},
		actos: { viewing: viewing.actos.length, actual: actual.actos.length },
		escenas: { viewing: viewingEscenasCount, actual: actualEscenasCount }
	};
}

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

		const ext = getScriptExt(script.filename);
		if (!ext) {
			return fail(400, { error: 'Formato de script no reconocido' });
		}

		let text: string;
		try {
			text = await extractScriptText(buffer, ext);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'error';
			return fail(500, { error: `No se pudo leer el script: ${msg}` });
		}

		if (!text.trim()) {
			const hint =
				ext === '.pdf'
					? 'El PDF no contiene texto extraíble (¿está escaneado o es solo imagen?). Conviértelo con Acrobat o usa un .docx.'
					: 'El script está vacío';
			return fail(400, { error: hint });
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

		persistBuildResult(id, parsed, { model, restoredFromId: null });

		return { success: true, result: parsed };
	},

	restore: async ({ params, request }) => {
		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) {
			return fail(400, { error: 'id inválido' });
		}

		const formData = await request.formData();
		const buildId = Number(formData.get('buildId'));
		if (!Number.isFinite(buildId) || buildId <= 0) {
			return fail(400, { error: 'buildId inválido' });
		}

		const [source] = await db
			.select()
			.from(scriptBuilds)
			.where(and(eq(scriptBuilds.id, buildId), eq(scriptBuilds.proyectoId, id)));

		if (!source) return fail(404, { error: 'Versión no encontrada' });

		let parsed: unknown;
		try {
			parsed = JSON.parse(source.json);
		} catch {
			return fail(500, { error: 'La versión almacenada tiene JSON inválido' });
		}

		if (!isBuildResult(parsed)) {
			return fail(500, { error: 'La versión almacenada no respeta el schema esperado' });
		}

		persistBuildResult(id, parsed, {
			model: source.model,
			restoredFromId: source.id
		});

		return { success: true, restored: source.id };
	},

	deleteVersion: async ({ params, request }) => {
		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) {
			return fail(400, { error: 'id inválido' });
		}

		const formData = await request.formData();
		const buildId = Number(formData.get('buildId'));
		if (!Number.isFinite(buildId) || buildId <= 0) {
			return fail(400, { error: 'buildId inválido' });
		}

		const [latest] = await db
			.select({ id: scriptBuilds.id })
			.from(scriptBuilds)
			.where(eq(scriptBuilds.proyectoId, id))
			.orderBy(desc(scriptBuilds.createdAt), desc(scriptBuilds.id))
			.limit(1);

		if (!latest) return fail(404, { error: 'No hay versiones para este proyecto' });
		if (latest.id === buildId) {
			return fail(400, {
				error: 'No se puede borrar la versión actual — esa es el estado en vivo de la base.'
			});
		}

		await db
			.delete(scriptBuilds)
			.where(and(eq(scriptBuilds.id, buildId), eq(scriptBuilds.proyectoId, id)));

		return { success: true, deleted: buildId };
	}
};

// ---------------------------------------------------------------------------
// Persistencia compartida (usada por las acciones build y restore).
//
// Estrategias:
// (a) Actos + Escenas: wipe + insert. Estructurales al guion.
// (b) Personajes + Escenarios: UPSERT por nombre con `source`. AI = source='ai',
//     manual nunca se toca, ghosts AI se borran. La `descripcion` solo se rellena
//     si la fila existente la tiene vacía y el AI extrajo una.
//
// better-sqlite3 transactions must be synchronous.
// ---------------------------------------------------------------------------
function persistBuildResult(
	id: number,
	parsed: BuildResult,
	versionMeta: { model: string; restoredFromId: number | null }
) {
	const allEscenas = parsed.actos.flatMap((a) => a.escenas);
		const escenarioNombres = Array.from(new Set(allEscenas.map((e) => e.escenario))).filter(
			(n) => n.length > 0
		);
		const personajeNombres = Array.from(
			new Set(allEscenas.flatMap((e) => e.personajes))
		).filter((n) => n.length > 0);

		const descripcionByEscenario = new Map<string, string>();
		for (const info of parsed.escenarios) {
			descripcionByEscenario.set(info.nombre, info.descripcion);
		}
		const descripcionByPersonaje = new Map<string, string>();
		for (const info of parsed.personajes) {
			descripcionByPersonaje.set(info.nombre, info.descripcion);
		}

		db.transaction((tx) => {
			// 1. Wipe estructura del guion (escenas + actos → cascade a participaciones).
			//    Antes de borrar actos guardamos sus duraciones manuales/previas keyed
			//    por numero — el numero de acto es estable entre corridas, así que
			//    podemos re-asociarlas al reconstruir y preservar ediciones del usuario.
			const previousActoDuraciones = tx
				.select({ numero: actos.numero, duracionSegundos: actos.duracionSegundos })
				.from(actos)
				.where(eq(actos.proyectoId, id))
				.all();
			const duracionByActoNumero = new Map<number, number | null>();
			for (const a of previousActoDuraciones) {
				duracionByActoNumero.set(a.numero, a.duracionSegundos);
			}

			tx.delete(escenas).where(eq(escenas.proyectoId, id)).run();
			tx.delete(actos).where(eq(actos.proyectoId, id)).run();

			// 2. Ghost cleanup: borrar SOLO escenarios source='ai' que ya no aparecen
			if (escenarioNombres.length > 0) {
				tx.delete(escenarios)
					.where(
						and(
							eq(escenarios.proyectoId, id),
							eq(escenarios.source, 'ai'),
							notInArray(escenarios.nombre, escenarioNombres)
						)
					)
					.run();
			} else {
				tx.delete(escenarios)
					.where(and(eq(escenarios.proyectoId, id), eq(escenarios.source, 'ai')))
					.run();
			}

			// 3. UPSERT escenarios: traer existentes, insertar los faltantes con source='ai'
			const existingEscenarios =
				escenarioNombres.length > 0
					? tx
							.select({
								id: escenarios.id,
								nombre: escenarios.nombre,
								descripcion: escenarios.descripcion
							})
							.from(escenarios)
							.where(
								and(
									eq(escenarios.proyectoId, id),
									inArray(escenarios.nombre, escenarioNombres)
								)
							)
							.all()
					: [];
			const escenarioIdByNombre = new Map<string, number>();
			for (const r of existingEscenarios) {
				escenarioIdByNombre.set(r.nombre, r.id);
				// Gap fill: si la fila existente no tiene descripción y el AI sí la extrajo, la rellenamos.
				const aiDescripcion = descripcionByEscenario.get(r.nombre) ?? '';
				if (!r.descripcion.trim() && aiDescripcion.trim()) {
					tx.update(escenarios)
						.set({ descripcion: aiDescripcion })
						.where(eq(escenarios.id, r.id))
						.run();
				}
			}
			const [{ minPos: minEscenarioPos }] = tx
				.select({ minPos: min(escenarios.position) })
				.from(escenarios)
				.where(eq(escenarios.proyectoId, id))
				.all();
			let nextEscenarioPos = (minEscenarioPos ?? 0) - 1;
			for (const nombre of escenarioNombres) {
				if (escenarioIdByNombre.has(nombre)) continue; // ya existe, preserva id + descripción
				const descripcion = descripcionByEscenario.get(nombre) ?? '';
				const [row] = tx
					.insert(escenarios)
					.values({
						proyectoId: id,
						nombre,
						descripcion,
						source: 'ai',
						position: nextEscenarioPos
					})
					.returning({ id: escenarios.id })
					.all();
				escenarioIdByNombre.set(nombre, row.id);
				nextEscenarioPos -= 1;
			}

			// 4. Ghost cleanup: borrar SOLO personajes source='ai' que ya no aparecen
			if (personajeNombres.length > 0) {
				tx.delete(personajes)
					.where(
						and(
							eq(personajes.proyectoId, id),
							eq(personajes.source, 'ai'),
							notInArray(personajes.nombre, personajeNombres)
						)
					)
					.run();
			} else {
				tx.delete(personajes)
					.where(and(eq(personajes.proyectoId, id), eq(personajes.source, 'ai')))
					.run();
			}

			// 5. UPSERT personajes: traer existentes, insertar los faltantes con source='ai'
			const existingPersonajes =
				personajeNombres.length > 0
					? tx
							.select({
								id: personajes.id,
								nombre: personajes.nombre,
								descripcion: personajes.descripcion
							})
							.from(personajes)
							.where(
								and(
									eq(personajes.proyectoId, id),
									inArray(personajes.nombre, personajeNombres)
								)
							)
							.all()
					: [];
			const personajeIdByNombre = new Map<string, number>();
			for (const r of existingPersonajes) {
				personajeIdByNombre.set(r.nombre, r.id);
				// Gap fill: si la fila existente no tiene descripción y el AI sí la extrajo, la rellenamos.
				const aiDescripcion = descripcionByPersonaje.get(r.nombre) ?? '';
				if (!r.descripcion.trim() && aiDescripcion.trim()) {
					tx.update(personajes)
						.set({ descripcion: aiDescripcion })
						.where(eq(personajes.id, r.id))
						.run();
				}
			}
			const [{ minPos: minPersonajePos }] = tx
				.select({ minPos: min(personajes.position) })
				.from(personajes)
				.where(eq(personajes.proyectoId, id))
				.all();
			let nextPersonajePos = (minPersonajePos ?? 0) - 1;
			for (const nombre of personajeNombres) {
				if (personajeIdByNombre.has(nombre)) continue; // ya existe, preserva id + descripción
				const descripcion = descripcionByPersonaje.get(nombre) ?? '';
				const [row] = tx
					.insert(personajes)
					.values({
						proyectoId: id,
						nombre,
						descripcion,
						source: 'ai',
						position: nextPersonajePos
					})
					.returning({ id: personajes.id })
					.all();
				personajeIdByNombre.set(nombre, row.id);
				nextPersonajePos -= 1;
			}

			// 6. Insert actos y escenas con FKs resueltos
			for (const acto of parsed.actos) {
				const [actoRow] = tx
					.insert(actos)
					.values({
						proyectoId: id,
						numero: acto.numero,
						titulo: acto.titulo,
						// Gap-fill: si había una duración previa (manual o de un build anterior),
						// la respetamos. Si no, usamos la estimación del AI.
						duracionSegundos:
							duracionByActoNumero.get(acto.numero) ?? acto.duracionEstimadaSegundos
					})
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
							texto: escena.texto,
							personajes: escena.personajes,
							actoNumero: acto.numero,
							actoTitulo: acto.titulo
						})
						.returning({ id: escenas.id })
						.all();

					// 7. Participaciones (rebuild — están atadas a escenas que acabamos de crear)
					for (const nombre of escena.personajes) {
						const personajeId = personajeIdByNombre.get(nombre);
						if (personajeId === undefined) continue;
						tx.insert(participaciones)
							.values({ escenaId: escenaRow.id, personajeId })
							.run();
					}
				}
			}

			// 8. Gap-fill duración estimada del proyecto: solo se setea si está null.
			//    Si el usuario ya tenía un valor manual, lo respetamos.
			const [proyectoRow] = tx
				.select({ duracionEstimadaSegundos: proyectos.duracionEstimadaSegundos })
				.from(proyectos)
				.where(eq(proyectos.id, id))
				.all();
			if (
				proyectoRow &&
				proyectoRow.duracionEstimadaSegundos === null &&
				parsed.duracionEstimadaSegundos > 0
			) {
				tx.update(proyectos)
					.set({ duracionEstimadaSegundos: parsed.duracionEstimadaSegundos })
					.where(eq(proyectos.id, id))
					.run();
			}

			// 9. Historial: archiva esta corrida completa como una versión
			tx.insert(scriptBuilds)
				.values({
					proyectoId: id,
					model: versionMeta.model,
					restoredFromId: versionMeta.restoredFromId,
					json: JSON.stringify(parsed)
				})
				.run();
		});
}
