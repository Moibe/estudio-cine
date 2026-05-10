<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { ArrowLeft, Zap, Loader2, Download } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let processing = $state(false);

	const MODELS = [
		{ id: 'gpt-4.1-nano', label: 'gpt-4.1-nano · más barato' },
		{ id: 'gpt-4o-mini', label: 'gpt-4o-mini · barato (default)' },
		{ id: 'gpt-4.1-mini', label: 'gpt-4.1-mini · ~3x' },
		{ id: 'o3-mini', label: 'o3-mini · reasoning ~8x' },
		{ id: 'gpt-4o', label: 'gpt-4o · ~25x' },
		{ id: 'gpt-4.1', label: 'gpt-4.1 · más capaz ~30x' }
	];

	const MODEL_STORAGE_KEY = 'estudio-cine:last-model';
	let selectedModel = $state('gpt-4o-mini');

	onMount(() => {
		const stored = localStorage.getItem(MODEL_STORAGE_KEY);
		if (stored && MODELS.some((m) => m.id === stored)) {
			selectedModel = stored;
		}
	});

	function persistModel() {
		localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
	}

	const saved = $derived.by(() => {
		if ((data.escenas?.length ?? 0) === 0) return null;
		const groups = new Map<
			number,
			{
				numero: number;
				titulo: string;
				escenas: Array<{
					numero: number;
					titulo: string;
					especificacion: string;
					escenario: string;
					descripcion: string;
					personajes: string[];
				}>;
			}
		>();
		for (const e of data.escenas) {
			let g = groups.get(e.actoNumero);
			if (!g) {
				g = { numero: e.actoNumero, titulo: e.actoTitulo, escenas: [] };
				groups.set(e.actoNumero, g);
			}
			g.escenas.push({
				numero: e.numero,
				titulo: e.titulo,
				especificacion: e.encabezado,
				escenario: e.escenarioNombre,
				descripcion: e.descripcion,
				personajes: e.personajes
			});
		}
		return {
			titulo: '',
			actos: Array.from(groups.values()).sort((a, b) => a.numero - b.numero)
		};
	});

	const displayed = $derived<unknown>(form?.result ?? saved);

	const regeneratedAt = $derived<Date | null>(
		data.escenas?.[0]?.createdAt ? new Date(data.escenas[0].createdAt) : null
	);

	function formatRegenDate(d: Date): string {
		return d.toLocaleString('es-MX', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function jsonLines(obj: unknown): Array<{ indent: number; text: string }> {
		return JSON.stringify(obj, null, 2)
			.split('\n')
			.map((line) => {
				const m = line.match(/^( *)(.*)$/);
				return { indent: m?.[1].length ?? 0, text: m?.[2] ?? '' };
			});
	}

	function safeFilename(s: string): string {
		return s
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-zA-Z0-9-_]+/g, '_')
			.replace(/^_+|_+$/g, '');
	}

	function downloadJson() {
		if (!displayed) return;
		const json = JSON.stringify(displayed, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		a.download = `${safeFilename(data.proyecto.titulo)}-${ts}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<section class="page">
	<a href="/proyectos/{data.proyecto.id}" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>{data.proyecto.titulo}</span>
	</a>

	<header class="header">
		<h1>Constructor de JSON</h1>
		<p class="meta">
			Procesar <strong>{data.script.originalName}</strong> con IA y extraer la estructura de escenas.
		</p>
	</header>

	<form
		method="POST"
		action="?/build"
		class="action-bar"
		use:enhance={() => {
			processing = true;
			return async ({ update }) => {
				await update({ reset: false });
				processing = false;
			};
		}}
	>
		<button type="submit" class="build-btn" disabled={processing}>
			{#if processing}
				<Loader2 size={16} strokeWidth={2.4} class="spin" />
				<span>Procesando…</span>
			{:else}
				<Zap size={16} strokeWidth={2.4} />
				<span>{displayed ? 'Reprocesar' : 'Construir JSON'}</span>
			{/if}
		</button>

		<select
			name="model"
			class="model-select"
			bind:value={selectedModel}
			onchange={persistModel}
			disabled={processing}
			aria-label="Modelo de OpenAI"
		>
			{#each MODELS as m (m.id)}
				<option value={m.id}>{m.label}</option>
			{/each}
		</select>

		<span class="model-hint">structured outputs</span>
	</form>

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}

	{#if displayed}
		<section class="result">
			<header class="result-header">
				<h2>
					Resultado
					{#if form?.success}
						<span class="badge fresh">recién generado</span>
					{:else}
						<span class="badge cached">guardado</span>
					{/if}
					{#if regeneratedAt}
						<span class="regen-date">{formatRegenDate(regeneratedAt)}</span>
					{/if}
				</h2>
				<button type="button" class="save-btn" onclick={downloadJson}>
					<Download size={15} strokeWidth={2.2} />
					<span>Guardar</span>
				</button>
			</header>
			<div class="json-output">
				{#each jsonLines(displayed) as line, i (i)}
					<div class="json-line" style="--indent: {line.indent}">{line.text}</div>
				{/each}
			</div>
		</section>
	{/if}
</section>

<style>
	.page {
		padding: 2rem 2.5rem 4rem;
		max-width: 920px;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.7rem 0.4rem 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		text-decoration: none;
		font-size: 0.9rem;
		transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
	}

	.back:hover {
		background: rgba(255, 255, 255, 0.09);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.18);
	}

	.header {
		margin-top: 1.5rem;
	}

	h1 {
		margin: 0 0 0.4rem;
		font-size: 1.75rem;
		letter-spacing: -0.005em;
	}

	.meta {
		margin: 0;
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.95rem;
		font-weight: 400;
	}

	.meta strong {
		color: rgba(255, 255, 255, 0.9);
	}

	.action-bar {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		margin-top: 1.5rem;
		flex-wrap: wrap;
	}

	.build-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1.2rem;
		font: inherit;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		cursor: pointer;
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease,
			opacity 0.18s ease;
	}

	.build-btn:hover:not(:disabled) {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
	}

	.build-btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.build-btn :global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes -global-spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.model-select {
		appearance: none;
		-webkit-appearance: none;
		padding: 0.55rem 2rem 0.55rem 0.85rem;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.92);
		background-color: rgba(255, 255, 255, 0.05);
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
		background-repeat: no-repeat;
		background-position: right 0.7rem center;
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.18s ease, border-color 0.18s ease;
	}

	.model-select:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.24);
	}

	.model-select:focus {
		outline: none;
		border-color: rgba(37, 99, 235, 0.6);
	}

	.model-select:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.model-select option {
		background: #0A1929;
		color: #fff;
	}

	.model-hint {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.45);
		font-weight: 400;
		letter-spacing: 0.01em;
	}

	.error {
		margin: 1rem 0 0;
		padding: 0.6rem 0.9rem;
		color: #fecaca;
		background: rgba(220, 38, 38, 0.12);
		border: 1px solid rgba(220, 38, 38, 0.32);
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 400;
	}

	.result {
		margin-top: 2rem;
	}

	.result-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.85rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.85);
		letter-spacing: 0.01em;
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
	}

	.badge {
		display: inline-block;
		padding: 0.2rem 0.55rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border-radius: 999px;
		border: 1px solid;
	}

	.badge.fresh {
		color: #86efac;
		background: rgba(22, 163, 74, 0.12);
		border-color: rgba(22, 163, 74, 0.32);
	}

	.badge.cached {
		color: rgba(255, 255, 255, 0.55);
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.16);
	}

	.regen-date {
		font-size: 0.78rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 0.01em;
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.85rem;
		font: inherit;
		font-size: 0.88rem;
		color: rgba(255, 255, 255, 0.92);
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.save-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.24);
		color: #fff;
	}

	.json-output {
		margin: 0;
		padding: 1.25rem 1.5rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		max-height: 70vh;
		overflow-x: hidden;
		overflow-y: auto;
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.85rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.92);
		font-weight: 400;
	}

	.json-line {
		padding-left: calc(var(--indent, 0) * 1ch);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-height: 1.55em;
	}
</style>
