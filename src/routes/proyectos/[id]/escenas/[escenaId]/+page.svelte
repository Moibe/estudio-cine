<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import {
		ArrowLeft,
		Camera,
		ChevronDown,
		Clapperboard,
		Clock,
		Film,
		Frame,
		Loader2,
		MapPin,
		Move,
		Users,
		Zap
	} from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let processing = $state(false);
	let textoCollapsed = $state(true);

	function toggleTexto() {
		textoCollapsed = !textoCollapsed;
	}

	function handleTextoKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleTexto();
		}
	}

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

	function formatDuration(seg: number | null): string {
		if (seg === null || seg === undefined) return '';
		if (seg < 60) return `${seg}s`;
		const m = Math.floor(seg / 60);
		const s = seg % 60;
		return s === 0 ? `${m}m` : `${m}m ${s}s`;
	}

	const totalDuration = $derived(
		data.tomas.reduce((acc, t) => acc + (t.duracionSegundos ?? 0), 0)
	);
</script>

<section class="page">
	<a href="/proyectos/{data.escena.proyectoId}/historia" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>Historia</span>
	</a>

	<header class="header">
		<Clapperboard size={20} strokeWidth={2} class="header-icon" />
		<div class="header-text">
			<div class="numero-row">
				<span class="numero">Escena {data.escena.numero}</span>
				{#if data.escena.actoTitulo}
					<span class="acto">Acto {data.escena.actoNumero} · {data.escena.actoTitulo}</span>
				{:else}
					<span class="acto">Acto {data.escena.actoNumero}</span>
				{/if}
			</div>
			<h1>{data.escena.titulo || data.escena.encabezado}</h1>
			{#if data.escena.titulo}
				<p class="spec">{data.escena.encabezado}</p>
			{/if}
		</div>
	</header>

	<section class="block">
		<h2>Descripción</h2>
		{#if data.escena.descripcion}
			<p class="descripcion">{data.escena.descripcion}</p>
		{:else}
			<p class="descripcion-vacia">Sin descripción todavía.</p>
		{/if}
	</section>

	{#if data.escena.texto}
		<section class="block">
			<div
				class="texto-header"
				class:collapsed={textoCollapsed}
				role="button"
				tabindex="0"
				aria-expanded={!textoCollapsed}
				onclick={toggleTexto}
				onkeydown={handleTextoKeydown}
			>
				<ChevronDown size={16} strokeWidth={2.4} class="chevron" />
				<h2>Escena completa</h2>
			</div>
			{#if !textoCollapsed}
				<pre class="texto" transition:slide={{ duration: 200 }}>{data.escena.texto}</pre>
			{/if}
		</section>
	{/if}

	<section class="block">
		<header class="tomas-header">
			<h2>
				<Film size={14} strokeWidth={2.2} class="meta-icon" />
				Tomas
				{#if data.tomas.length > 0}
					<span class="tomas-count">{data.tomas.length}</span>
					{#if totalDuration > 0}
						<span class="tomas-total">≈ {formatDuration(totalDuration)}</span>
					{/if}
				{/if}
			</h2>
			{#if data.escena.texto}
				<form
					method="POST"
					action="?/buildTomas"
					class="tomas-form"
					use:enhance={() => {
						processing = true;
						return async ({ update }) => {
							await update({ reset: false });
							processing = false;
						};
					}}
				>
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
					<button type="submit" class="build-btn" disabled={processing}>
						{#if processing}
							<Loader2 size={14} strokeWidth={2.4} class="spin" />
							<span>Generando…</span>
						{:else}
							<Zap size={14} strokeWidth={2.4} />
							<span>{data.tomas.length > 0 ? 'Regenerar' : 'Generar tomas'}</span>
						{/if}
					</button>
				</form>
			{/if}
		</header>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		{#if !data.escena.texto}
			<p class="descripcion-vacia">
				Esta escena no tiene texto verbatim. Procesa el script desde Historia →
				Construir desde el script para extraerlo, y luego podrás generar tomas aquí.
			</p>
		{:else if data.tomas.length === 0}
			<p class="descripcion-vacia">
				Aún no hay tomas. Genera una propuesta de cobertura desde el cuerpo de la
				escena con IA.
			</p>
		{:else}
			<ol class="tomas-list">
				{#each data.tomas as t (t.id)}
					<li class="toma-card">
						<div class="toma-numero">{t.numero}</div>
						<div class="toma-body">
							<div class="toma-head">
								<h3 class="toma-tipo">{t.tipoToma}</h3>
								{#if t.duracionSegundos !== null}
									<span class="toma-duracion">
										<Clock size={11} strokeWidth={2.2} />
										{formatDuration(t.duracionSegundos)}
									</span>
								{/if}
							</div>
							<p class="toma-encuadre">
								<Camera size={12} strokeWidth={2.2} class="meta-icon" />
								<span>{t.encuadre}</span>
							</p>
							{#if t.descripcion}
								<p class="toma-descripcion">{t.descripcion}</p>
							{/if}
							<div class="toma-attrs">
								{#if t.composicion}
									<span class="toma-attr">
										<Frame size={11} strokeWidth={2.2} class="meta-icon" />
										{t.composicion}
									</span>
								{/if}
								{#if t.movimientoCamara}
									<span class="toma-attr">
										<Move size={11} strokeWidth={2.2} class="meta-icon" />
										{t.movimientoCamara}
									</span>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<div class="meta-row">
		{#if data.escena.escenarioId && data.escena.escenarioNombre}
			<div class="meta-section">
				<MapPin size={14} strokeWidth={2.2} class="meta-icon" />
				<span class="meta-label">Escenario</span>
				<a
					class="chip chip-escenario"
					href="/proyectos/{data.escena.proyectoId}/escenarios/{data.escena.escenarioId}"
				>
					{data.escena.escenarioNombre}
				</a>
			</div>
		{/if}

		{#if data.escena.personajes.length > 0}
			<div class="meta-section">
				<Users size={14} strokeWidth={2.2} class="meta-icon" />
				<span class="meta-label">Personajes</span>
				<div class="chips">
					{#each data.escena.personajes as p (p.id)}
						<a
							class="chip chip-personaje"
							href="/proyectos/{data.escena.proyectoId}/personajes/{p.id}"
						>
							{p.nombre}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.back {
		display: inline-flex;
		align-self: flex-start;
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
		display: flex;
		align-items: flex-start;
		gap: 0.85rem;
		margin-top: 0.5rem;
	}

	.header :global(.header-icon) {
		color: rgba(255, 255, 255, 0.7);
		flex-shrink: 0;
		margin-top: 0.35rem;
	}

	.header-text {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex: 1;
		min-width: 0;
	}

	.numero-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.numero {
		display: inline-block;
		padding: 0.2rem 0.55rem;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.18);
		border: 1px solid rgba(37, 99, 235, 0.32);
		border-radius: 6px;
	}

	.acto {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
	}

	h1 {
		margin: 0;
		font-size: 1.55rem;
		letter-spacing: -0.005em;
		line-height: 1.25;
	}

	.spec {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.block h2 {
		margin: 0 0 0.85rem;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.45);
		font-weight: 700;
	}

	.descripcion {
		margin: 0;
		padding: 1rem 1.2rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.92);
		font-weight: 400;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.descripcion-vacia {
		margin: 0;
		padding: 1rem 1.2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.14);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 400;
		font-style: italic;
		line-height: 1.55;
	}

	.texto-header {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.55rem 0.3rem 0.4rem;
		margin: 0 -0.55rem 0.6rem;
		border-radius: 8px;
		cursor: pointer;
		user-select: none;
		transition: background 0.18s ease;
	}

	.texto-header:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.texto-header:focus-visible {
		outline: 1px solid rgba(255, 255, 255, 0.3);
		outline-offset: 2px;
	}

	.texto-header h2 {
		margin: 0;
	}

	.texto-header :global(.chevron) {
		color: rgba(255, 255, 255, 0.55);
		flex-shrink: 0;
		transition: transform 0.22s ease;
	}

	.texto-header.collapsed :global(.chevron) {
		transform: rotate(-90deg);
	}

	.texto {
		display: block;
		box-sizing: border-box;
		width: 100%;
		max-width: 90ch;
		max-height: 65vh;
		margin: 0 auto;
		padding: 1.5rem 2rem;
		background: rgba(0, 0, 0, 0.22);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.92);
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		font-weight: 400;
		font-size: 0.88rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-x: auto;
		overflow-y: auto;
	}

	.meta-row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.meta-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.meta-section :global(.meta-icon) {
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.meta-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.7rem;
		font-size: 0.78rem;
		border-radius: 999px;
		text-decoration: none;
		font-weight: 700;
		letter-spacing: 0.02em;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.chip-personaje {
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.12);
		border: 1px solid rgba(37, 99, 235, 0.3);
	}

	.chip-personaje:hover {
		background: rgba(37, 99, 235, 0.24);
		border-color: rgba(37, 99, 235, 0.55);
		color: #fff;
	}

	.chip-escenario {
		color: rgba(255, 255, 255, 0.92);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.16);
	}

	.chip-escenario:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.28);
		color: #fff;
	}

	.tomas-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.85rem;
		flex-wrap: wrap;
		margin-bottom: 0.85rem;
	}

	.tomas-header h2 {
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.tomas-header h2 :global(.meta-icon) {
		color: rgba(255, 255, 255, 0.5);
	}

	.tomas-count {
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.1rem 0.45rem;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(37, 99, 235, 0.18);
		border: 1px solid rgba(37, 99, 235, 0.32);
		border-radius: 999px;
		letter-spacing: 0.02em;
	}

	.tomas-total {
		font-size: 0.72rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.5);
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		letter-spacing: 0.02em;
	}

	.tomas-form {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.model-select {
		appearance: none;
		-webkit-appearance: none;
		padding: 0.45rem 1.85rem 0.45rem 0.75rem;
		font: inherit;
		font-size: 0.78rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.9);
		background-color: rgba(255, 255, 255, 0.05);
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
		background-repeat: no-repeat;
		background-position: right 0.6rem center;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.18s ease, border-color 0.18s ease;
	}

	.model-select:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.22);
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

	.build-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.95rem;
		font: inherit;
		font-size: 0.82rem;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 8px;
		cursor: pointer;
		box-shadow: 0 3px 12px rgba(37, 99, 235, 0.32);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease,
			opacity 0.18s ease;
	}

	.build-btn:hover:not(:disabled) {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 5px 16px rgba(37, 99, 235, 0.42);
	}

	.build-btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.build-btn :global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes -global-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		margin: 0 0 0.85rem;
		padding: 0.6rem 0.9rem;
		color: #fecaca;
		background: rgba(220, 38, 38, 0.12);
		border: 1px solid rgba(220, 38, 38, 0.32);
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 400;
	}

	.tomas-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.toma-card {
		display: flex;
		gap: 0.95rem;
		padding: 0.95rem 1.1rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.toma-numero {
		flex-shrink: 0;
		width: 2.2rem;
		height: 2.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: rgba(37, 99, 235, 0.16);
		color: #93c5fd;
		font-size: 0.88rem;
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
	}

	.toma-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.toma-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.7rem;
		flex-wrap: wrap;
	}

	.toma-tipo {
		margin: 0;
		font-size: 0.98rem;
		color: rgba(255, 255, 255, 0.96);
		letter-spacing: 0.005em;
	}

	.toma-duracion {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.72rem;
		font-weight: 700;
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		color: rgba(255, 255, 255, 0.55);
		flex-shrink: 0;
	}

	.toma-encuadre {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.82);
		line-height: 1.45;
	}

	.toma-encuadre :global(.meta-icon) {
		color: rgba(255, 255, 255, 0.45);
		flex-shrink: 0;
	}

	.toma-descripcion {
		margin: 0.1rem 0 0;
		font-size: 0.9rem;
		font-weight: 400;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.86);
	}

	.toma-attrs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.2rem;
	}

	.toma-attr {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.6rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		letter-spacing: 0.01em;
	}

	.toma-attr :global(.meta-icon) {
		color: rgba(255, 255, 255, 0.45);
		flex-shrink: 0;
	}
</style>
