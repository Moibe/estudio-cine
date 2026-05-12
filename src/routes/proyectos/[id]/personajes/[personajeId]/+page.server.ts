import { error, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { personajes } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const PHOTOS_DIR = path.join('static', 'uploads', 'personajes');
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const VALID_PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const;

function getPhotoExt(filename: string): (typeof VALID_PHOTO_EXTS)[number] | null {
	const lower = filename.toLowerCase();
	for (const ext of VALID_PHOTO_EXTS) {
		if (lower.endsWith(ext)) return ext;
	}
	return null;
}

const ENHANCE_MODEL = 'gpt-4o-mini';

const ENHANCE_SYSTEM_PROMPT = `Eres un script doctor / story editor. Recibirás una descripción existente de un personaje y debes ENRIQUECERLA sin cambiar su significado ni agregar hechos que no estén implícitos en el original.

REGLAS ESTRICTAS:
- Devuelve la descripción mejorada en UN SOLO PÁRRAFO, máximo 3-5 oraciones.
- Pégate MUY cerca al texto original. No inventes backstory, edad, motivaciones, traits físicos ni emocionales que no estén ya presentes o claramente implícitos.
- Mejora gramática, precisión de las palabras, ritmo, y profundiza lo que YA está ahí.
- Si el original es muy escueto, está bien que el resultado también sea breve — la consigna no es expandir por expandir, es enriquecer respetando.
- El resultado debe estar en el mismo idioma del original (típicamente español).
- NUNCA agregues notas, comillas, o meta-comentarios. SOLO el párrafo.`;

const ENHANCE_SCHEMA = {
	type: 'object',
	properties: {
		descripcion: { type: 'string' }
	},
	required: ['descripcion'],
	additionalProperties: false
};

function isEnhanceResult(x: unknown): x is { descripcion: string } {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	return typeof o.descripcion === 'string';
}

export const load: PageServerLoad = async ({ params }) => {
	const proyectoId = Number(params.id);
	const personajeId = Number(params.personajeId);

	if (
		!Number.isFinite(proyectoId) ||
		proyectoId <= 0 ||
		!Number.isFinite(personajeId) ||
		personajeId <= 0
	) {
		error(400, 'ids inválidos');
	}

	const [personaje] = await db
		.select()
		.from(personajes)
		.where(and(eq(personajes.id, personajeId), eq(personajes.proyectoId, proyectoId)));

	if (!personaje) error(404, 'Personaje no encontrado');

	return { personaje };
};

export const actions: Actions = {
	updateDescripcion: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		const personajeId = Number(params.personajeId);

		if (
			!Number.isFinite(proyectoId) ||
			proyectoId <= 0 ||
			!Number.isFinite(personajeId) ||
			personajeId <= 0
		) {
			return fail(400, { error: 'ids inválidos' });
		}

		const data = await request.formData();
		const descripcion = String(data.get('descripcion') ?? '');

		await db
			.update(personajes)
			.set({ descripcion })
			.where(and(eq(personajes.id, personajeId), eq(personajes.proyectoId, proyectoId)));

		return { success: true };
	},

	enhanceDescripcion: async ({ params }) => {
		const apiKey = env.OPENAI_API_KEY;
		if (!apiKey) {
			return fail(500, { error: 'OPENAI_API_KEY no configurada en .env' });
		}

		const proyectoId = Number(params.id);
		const personajeId = Number(params.personajeId);

		if (
			!Number.isFinite(proyectoId) ||
			proyectoId <= 0 ||
			!Number.isFinite(personajeId) ||
			personajeId <= 0
		) {
			return fail(400, { error: 'ids inválidos' });
		}

		const [personaje] = await db
			.select({
				nombre: personajes.nombre,
				descripcion: personajes.descripcion
			})
			.from(personajes)
			.where(and(eq(personajes.id, personajeId), eq(personajes.proyectoId, proyectoId)));

		if (!personaje) return fail(404, { error: 'Personaje no encontrado' });

		const current = personaje.descripcion.trim();
		if (!current) {
			return fail(400, {
				error: 'Escribe primero una descripción base para que la IA la pueda mejorar.'
			});
		}

		const userMessage = `Nombre del personaje: ${personaje.nombre}\n\nDescripción actual:\n${current}`;

		let openaiResponse: Response;
		try {
			openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					model: ENHANCE_MODEL,
					messages: [
						{ role: 'system', content: ENHANCE_SYSTEM_PROMPT },
						{ role: 'user', content: userMessage }
					],
					response_format: {
						type: 'json_schema',
						json_schema: {
							name: 'descripcion_mejorada',
							schema: ENHANCE_SCHEMA,
							strict: true
						}
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
			return fail(502, { error: `OpenAI ${openaiResponse.status}: ${txt.slice(0, 300)}` });
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

		if (!isEnhanceResult(parsed)) {
			return fail(502, { error: 'JSON no respeta el schema esperado' });
		}

		const enhanced = parsed.descripcion.trim();
		if (!enhanced) {
			return fail(502, { error: 'OpenAI regresó descripción vacía' });
		}

		await db
			.update(personajes)
			.set({ descripcion: enhanced })
			.where(and(eq(personajes.id, personajeId), eq(personajes.proyectoId, proyectoId)));

		return { success: true };
	},

	uploadFoto: async ({ params, request }) => {
		const proyectoId = Number(params.id);
		const personajeId = Number(params.personajeId);

		if (
			!Number.isFinite(proyectoId) ||
			proyectoId <= 0 ||
			!Number.isFinite(personajeId) ||
			personajeId <= 0
		) {
			return fail(400, { error: 'ids inválidos' });
		}

		const data = await request.formData();
		const file = data.get('foto');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Selecciona un archivo de imagen' });
		}

		if (file.size > MAX_PHOTO_SIZE) {
			return fail(400, {
				error: `Imagen muy grande (máx ${MAX_PHOTO_SIZE / 1024 / 1024} MB)`
			});
		}

		const ext = getPhotoExt(file.name);
		if (!ext) {
			return fail(400, { error: 'Solo imágenes .jpg, .png, .webp o .gif' });
		}

		await mkdir(PHOTOS_DIR, { recursive: true });

		// Borra fotos previas de este personaje (cualquier extensión).
		try {
			const entries = await readdir(PHOTOS_DIR);
			for (const entry of entries) {
				if (entry.startsWith(`${personajeId}.`)) {
					await unlink(path.join(PHOTOS_DIR, entry)).catch(() => {});
				}
			}
		} catch {
			// directorio recién creado, sin entries previos — OK
		}

		const filename = `${personajeId}${ext}`;
		const filepath = path.join(PHOTOS_DIR, filename);
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filepath, buffer);

		// Cache buster con timestamp para forzar refresh en el navegador.
		const fotoUrl = `/uploads/personajes/${filename}?v=${Date.now()}`;

		await db
			.update(personajes)
			.set({ foto: fotoUrl })
			.where(and(eq(personajes.id, personajeId), eq(personajes.proyectoId, proyectoId)));

		return { success: true };
	},

	deleteFoto: async ({ params }) => {
		const proyectoId = Number(params.id);
		const personajeId = Number(params.personajeId);

		if (
			!Number.isFinite(proyectoId) ||
			proyectoId <= 0 ||
			!Number.isFinite(personajeId) ||
			personajeId <= 0
		) {
			return fail(400, { error: 'ids inválidos' });
		}

		try {
			const entries = await readdir(PHOTOS_DIR);
			for (const entry of entries) {
				if (entry.startsWith(`${personajeId}.`)) {
					await unlink(path.join(PHOTOS_DIR, entry)).catch(() => {});
				}
			}
		} catch {
			// no hay directorio o archivos — nada que limpiar
		}

		await db
			.update(personajes)
			.set({ foto: null })
			.where(and(eq(personajes.id, personajeId), eq(personajes.proyectoId, proyectoId)));

		return { success: true };
	}
};
