<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		Clock,
		Download,
		FilePlus,
		Loader2,
		Minus,
		Plus,
		Sparkles,
		Trash2,
		Undo2,
		Zap
	} from '@lucide/svelte';
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
					texto: string;
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
				texto: e.texto,
				personajes: e.personajes.map((p) => p.nombre)
			});
		}
		return {
			titulo: '',
			escenarios: data.escenarios.map((esc) => ({
				nombre: esc.nombre,
				descripcion: esc.descripcion
			})),
			personajes: data.personajes.map((p) => ({
				nombre: p.nombre,
				descripcion: p.descripcion
			})),
			actos: Array.from(groups.values()).sort((a, b) => a.numero - b.numero)
		};
	});

	const displayed = $derived<unknown>(
		data.viewingBuild ? data.viewingBuild.json : (form?.result ?? saved)
	);
	const isViewingPast = $derived(!!data.viewingBuild);
	const latestBuildId = $derived(data.builds[0]?.id ?? null);

	let restoringId = $state<number | null>(null);
	let deletingId = $state<number | null>(null);

	function confirmDelete(versionId: number): boolean {
		return confirm(`¿Borrar la versión v${versionId}? Esto no se puede deshacer.`);
	}

	function confirmRestore(versionId: number): boolean {
		return confirm(
			`¿Restaurar la versión v${versionId} como actual?\n\nSe re-aplicará sobre la base de datos en vivo siguiendo las mismas reglas de UPSERT — tus filas manuales y descripciones editadas se respetan.`
		);
	}

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

	function formatVersionDate(d: Date | string): string {
		const date = new Date(d);
		return date.toLocaleString('es-MX', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
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
	<a href="/proyectos/{data.proyecto.id}/historia" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>Historia</span>
	</a>

	<header class="header">
		<h1>Constructor de JSON</h1>
		{#if data.script}
			<p class="meta">
				Procesar <strong>{data.script.originalName}</strong> con IA y extraer la estructura de
				escenas.
			</p>
		{:else}
			<p class="meta">Carga un script para extraer su estructura con IA.</p>
		{/if}
	</header>

	{#if !data.script}
		<div class="empty">
			<p>Aún no hay un script en este proyecto. Puedes escribirlo desde cero o importarlo.</p>
			<div class="script-options">
				<a class="script-option create" href={`/proyectos/${data.proyecto.id}/script/create`}>
					<Sparkles size={16} strokeWidth={2.2} />
					<span>Crear Script</span>
				</a>
				<a
					class="script-option import"
					href={`/proyectos/${data.proyecto.id}/historia`}
				>
					<FilePlus size={16} strokeWidth={2.2} />
					<span>Importar Script</span>
				</a>
			</div>
		</div>
	{:else}
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
	{/if}

	{#if isViewingPast && data.diff}
		{@const d = data.diff}
		<section class="diff">
			<header class="diff-header">
				<h2>Diferencias contra la versión actual</h2>
				<span class="diff-hint">v{data.viewingBuild?.id} → v{latestBuildId} (actual)</span>
			</header>
			<div class="diff-grid">
				<div class="diff-card">
					<span class="diff-label">Actos</span>
					<span class="diff-num">{d.actos.viewing} → {d.actos.actual}</span>
					{#if d.actos.actual !== d.actos.viewing}
						<span class="diff-delta">{d.actos.actual - d.actos.viewing > 0 ? '+' : ''}{d.actos.actual - d.actos.viewing}</span>
					{/if}
				</div>
				<div class="diff-card">
					<span class="diff-label">Escenas</span>
					<span class="diff-num">{d.escenas.viewing} → {d.escenas.actual}</span>
					{#if d.escenas.actual !== d.escenas.viewing}
						<span class="diff-delta">{d.escenas.actual - d.escenas.viewing > 0 ? '+' : ''}{d.escenas.actual - d.escenas.viewing}</span>
					{/if}
				</div>
			</div>

			{#if d.personajes.added.length + d.personajes.removed.length > 0}
				<div class="diff-section">
					<span class="diff-label">Personajes</span>
					<div class="diff-chips">
						{#each d.personajes.added as nombre (nombre)}
							<span class="diff-chip added"><Plus size={11} strokeWidth={2.6} /> {nombre}</span>
						{/each}
						{#each d.personajes.removed as nombre (nombre)}
							<span class="diff-chip removed"><Minus size={11} strokeWidth={2.6} /> {nombre}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if d.escenarios.added.length + d.escenarios.removed.length > 0}
				<div class="diff-section">
					<span class="diff-label">Escenarios</span>
					<div class="diff-chips">
						{#each d.escenarios.added as nombre (nombre)}
							<span class="diff-chip added"><Plus size={11} strokeWidth={2.6} /> {nombre}</span>
						{/each}
						{#each d.escenarios.removed as nombre (nombre)}
							<span class="diff-chip removed"><Minus size={11} strokeWidth={2.6} /> {nombre}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if d.personajes.added.length + d.personajes.removed.length + d.escenarios.added.length + d.escenarios.removed.length === 0 && d.actos.viewing === d.actos.actual && d.escenas.viewing === d.escenas.actual}
				<p class="diff-empty">Los conteos y nombres principales coinciden — las diferencias serían a nivel de descripciones o por-escena.</p>
			{/if}
		</section>
	{/if}

	{#if displayed}
		<section class="result">
			<header class="result-header">
				<h2>
					{#if isViewingPast}
						Versión anterior
						<span class="badge past">v{data.viewingBuild?.id}</span>
						<span class="regen-date">
							{data.viewingBuild?.model} · {formatVersionDate(
								data.viewingBuild!.createdAt
							)}
						</span>
					{:else}
						Resultado
						{#if form?.success}
							<span class="badge fresh">recién generado</span>
						{:else}
							<span class="badge cached">guardado</span>
						{/if}
						{#if regeneratedAt}
							<span class="regen-date">{formatRegenDate(regeneratedAt)}</span>
						{/if}
					{/if}
				</h2>
				<div class="result-actions">
					{#if isViewingPast}
						<a class="save-btn" href={`/proyectos/${data.proyecto.id}/script/build`}>
							<span>Volver al actual</span>
						</a>
					{/if}
					<button type="button" class="save-btn" onclick={downloadJson}>
						<Download size={15} strokeWidth={2.2} />
						<span>Guardar</span>
					</button>
				</div>
			</header>
			<div class="json-output">
				{#each jsonLines(displayed) as line, i (i)}
					<div class="json-line" style="--indent: {line.indent}">{line.text}</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.builds.length > 0}
		<section class="versions">
			<header class="versions-header">
				<Clock size={14} strokeWidth={2.2} />
				<h2>Versiones</h2>
				<span class="versions-count">{data.builds.length}</span>
			</header>
			<ul class="versions-list">
				{#each data.builds as v (v.id)}
					{@const isLatest = v.id === latestBuildId}
					{@const isOpen = data.viewingBuild?.id === v.id}
					<li class="version" class:open={isOpen} class:current={isLatest && !isViewingPast}>
						<a
							class="version-link"
							href={isLatest && !isViewingPast
								? `/proyectos/${data.proyecto.id}/script/build`
								: `/proyectos/${data.proyecto.id}/script/build?v=${v.id}`}
						>
							<span class="version-id">v{v.id}</span>
							<span class="version-date">{formatVersionDate(v.createdAt)}</span>
							<span class="version-model">
								{v.model}{#if v.restoredFromId}
									<span class="version-restore-mark">↺ v{v.restoredFromId}</span>
								{/if}
							</span>
							{#if isLatest && !isViewingPast}
								<span class="version-tag">actual</span>
							{:else if isOpen}
								<span class="version-tag">viendo</span>
							{/if}
						</a>
						<div class="version-actions">
							{#if !isLatest}
								<form
									method="POST"
									action="?/restore"
									use:enhance={({ cancel }) => {
										if (!confirmRestore(v.id)) {
											cancel();
											return;
										}
										restoringId = v.id;
										return async ({ update }) => {
											await update({ reset: false });
											restoringId = null;
										};
									}}
								>
									<input type="hidden" name="buildId" value={v.id} />
									<button
										type="submit"
										class="version-action restore"
										aria-label="Restaurar como actual"
										disabled={restoringId !== null || deletingId !== null}
									>
										{#if restoringId === v.id}
											<Loader2 size={14} strokeWidth={2.4} class="spin" />
										{:else}
											<Undo2 size={14} strokeWidth={2.4} />
										{/if}
									</button>
								</form>
							{/if}
							{#if !isLatest}
								<form
									method="POST"
									action="?/deleteVersion"
									use:enhance={({ cancel }) => {
										if (!confirmDelete(v.id)) {
											cancel();
											return;
										}
										deletingId = v.id;
										return async ({ update }) => {
											await update({ reset: false });
											deletingId = null;
										};
									}}
								>
									<input type="hidden" name="buildId" value={v.id} />
									<button
										type="submit"
										class="version-action delete"
										aria-label="Borrar versión"
										disabled={restoringId !== null || deletingId !== null}
									>
										{#if deletingId === v.id}
											<Loader2 size={14} strokeWidth={2.4} class="spin" />
										{:else}
											<Trash2 size={14} strokeWidth={2.4} />
										{/if}
									</button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
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

	.empty {
		margin-top: 1.5rem;
		padding: 2.5rem 2rem;
		text-align: center;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.18);
		border-radius: 14px;
		color: rgba(255, 255, 255, 0.65);
	}

	.empty p {
		margin: 0 0 1.15rem;
		font-weight: 400;
	}

	.script-options {
		display: inline-flex;
		gap: 0.7rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.script-option {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1.2rem;
		font: inherit;
		border-radius: 10px;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
	}

	.script-option.create {
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
	}

	.script-option.create:hover {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
	}

	.script-option.import {
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.18);
	}

	.script-option.import:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.28);
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

	.badge.past {
		color: #fde68a;
		background: rgba(217, 119, 6, 0.14);
		border-color: rgba(217, 119, 6, 0.4);
	}

	.result-actions {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.versions {
		margin-top: 2rem;
	}

	.versions-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.versions-header h2 {
		margin: 0;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
	}

	.versions-count {
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.1rem 0.45rem;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
	}

	.versions-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.version-link {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.65rem 0.95rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.92);
		font-size: 0.88rem;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.version-link:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.version.open .version-link {
		background: rgba(217, 119, 6, 0.12);
		border-color: rgba(217, 119, 6, 0.4);
	}

	.version.current .version-link {
		background: rgba(37, 99, 235, 0.12);
		border-color: rgba(37, 99, 235, 0.4);
	}

	.version-id {
		font-weight: 700;
		color: rgba(255, 255, 255, 0.95);
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.82rem;
		flex-shrink: 0;
	}

	.version-date {
		color: rgba(255, 255, 255, 0.7);
		flex: 1;
		font-weight: 400;
	}

	.version-model {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.78rem;
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		flex-shrink: 0;
	}

	.version-tag {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.version.current .version-tag {
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.2);
		border: 1px solid rgba(37, 99, 235, 0.4);
	}

	.version.open .version-tag {
		color: #fde68a;
		background: rgba(217, 119, 6, 0.2);
		border: 1px solid rgba(217, 119, 6, 0.4);
	}

	.version {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.version-link {
		flex: 1;
	}

	.version-actions {
		display: flex;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.version-actions form {
		margin: 0;
		display: flex;
	}

	.version-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font: inherit;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.version-action:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.22);
	}

	.version-action.restore:hover:not(:disabled) {
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.16);
		border-color: rgba(37, 99, 235, 0.4);
	}

	.version-action.delete:hover:not(:disabled) {
		color: #fca5a5;
		background: rgba(220, 38, 38, 0.16);
		border-color: rgba(220, 38, 38, 0.4);
	}

	.version-action:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.version-action :global(.spin) {
		animation: spin 1s linear infinite;
	}

	.version-restore-mark {
		margin-left: 0.4rem;
		padding: 0.05rem 0.4rem;
		font-size: 0.72rem;
		color: #fde68a;
		background: rgba(217, 119, 6, 0.16);
		border: 1px solid rgba(217, 119, 6, 0.32);
		border-radius: 999px;
	}

	.diff {
		margin-top: 1.5rem;
		padding: 1.25rem 1.4rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 14px;
	}

	.diff-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.85rem;
		flex-wrap: wrap;
		margin-bottom: 0.85rem;
	}

	.diff-header h2 {
		margin: 0;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 700;
	}

	.diff-hint {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.5);
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
	}

	.diff-grid {
		display: flex;
		gap: 0.7rem;
		flex-wrap: wrap;
		margin-bottom: 0.85rem;
	}

	.diff-card {
		display: inline-flex;
		align-items: baseline;
		gap: 0.55rem;
		padding: 0.55rem 0.85rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
	}

	.diff-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
	}

	.diff-num {
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		color: rgba(255, 255, 255, 0.92);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.diff-delta {
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		color: #93c5fd;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.diff-section {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		flex-wrap: wrap;
		padding: 0.65rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.diff-chips {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
		flex: 1;
	}

	.diff-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.2rem 0.55rem;
		font-size: 0.78rem;
		font-weight: 700;
		border-radius: 999px;
		border: 1px solid;
	}

	.diff-chip.added {
		color: #86efac;
		background: rgba(22, 163, 74, 0.14);
		border-color: rgba(22, 163, 74, 0.4);
	}

	.diff-chip.removed {
		color: #fca5a5;
		background: rgba(220, 38, 38, 0.14);
		border-color: rgba(220, 38, 38, 0.4);
	}

	.diff-empty {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 400;
		font-style: italic;
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
