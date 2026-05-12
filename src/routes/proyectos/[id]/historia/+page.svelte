<script lang="ts">
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import {
		BookOpen,
		Braces,
		Check,
		CheckCircle2,
		ChevronDown,
		Clapperboard,
		Clock,
		Download,
		Eye,
		FilePlus,
		FileText,
		MapPin,
		Pencil,
		Sparkles,
		Upload,
		Users,
		X,
		Zap
	} from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Estado del upload de script
	let fileInput: HTMLInputElement | undefined = $state();
	let uploading = $state(false);
	let selectedName = $state('');
	let showSuccess = $state(false);
	let successTimeout: ReturnType<typeof setTimeout> | undefined;
	let showUploadForm = $state(false);

	function handleFileChange() {
		selectedName = fileInput?.files?.[0]?.name ?? '';
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	}

	function formatDate(d: Date | string): string {
		return new Date(d).toLocaleDateString('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Map de actos COLAPSADOS — default vacío = todos expandidos
	let collapsedActos = $state<Record<number, boolean>>({});

	// Edición inline de la duración del acto
	let editingDuracionActoId = $state<number | null>(null);
	let duracionInput = $state('');
	let duracionInputEl: HTMLInputElement | undefined = $state();

	// Edición inline de la duración del proyecto
	let editingDuracionProyecto = $state(false);
	let duracionProyectoInput = $state('');
	let duracionProyectoInputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (editingDuracionActoId !== null && duracionInputEl) duracionInputEl.focus();
	});

	$effect(() => {
		if (editingDuracionProyecto && duracionProyectoInputEl) duracionProyectoInputEl.focus();
	});

	function toggleActo(numero: number) {
		collapsedActos[numero] = !collapsedActos[numero];
	}

	function handleActoKeydown(e: KeyboardEvent, numero: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleActo(numero);
		}
	}

	function startEditDuracion(actoId: number, current: number | null) {
		duracionInput = current !== null ? formatDuracionForInput(current) : '';
		editingDuracionActoId = actoId;
	}

	function cancelEditDuracion() {
		editingDuracionActoId = null;
		duracionInput = '';
	}

	function handleDuracionKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelEditDuracion();
	}

	function startEditDuracionProyecto(current: number | null) {
		duracionProyectoInput = current !== null ? formatDuracionForInput(current) : '';
		editingDuracionProyecto = true;
	}

	function cancelEditDuracionProyecto() {
		editingDuracionProyecto = false;
		duracionProyectoInput = '';
	}

	function handleDuracionProyectoKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelEditDuracionProyecto();
	}

	function formatDuracion(seg: number | null): string {
		if (seg === null || seg === undefined) return '—';
		if (seg < 60) return `${seg}s`;
		const h = Math.floor(seg / 3600);
		const m = Math.floor((seg % 3600) / 60);
		const s = seg % 60;
		const parts: string[] = [];
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		if (s > 0) parts.push(`${s}s`);
		return parts.join(' ');
	}

	function formatDuracionForInput(seg: number): string {
		const h = Math.floor(seg / 3600);
		const m = Math.floor((seg % 3600) / 60);
		const s = seg % 60;
		const parts: string[] = [];
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		if (s > 0) parts.push(`${s}s`);
		return parts.join(' ') || '0m';
	}

	type Escena = (typeof data.escenas)[number];
	type Acto = {
		id: number | null;
		numero: number;
		titulo: string;
		duracionSegundos: number | null;
		escenas: Escena[];
	};

	const actos: Acto[] = $derived.by(() => {
		// Mapa actoNumero → metadata (titulo, id, duracion) desde data.actos
		const metaByNumero = new Map<number, { id: number; titulo: string; duracionSegundos: number | null }>();
		for (const a of data.actos) {
			metaByNumero.set(a.numero, {
				id: a.id,
				titulo: a.titulo,
				duracionSegundos: a.duracionSegundos
			});
		}

		const groups = new Map<number, Acto>();
		for (const e of data.escenas) {
			let g = groups.get(e.actoNumero);
			if (!g) {
				const meta = metaByNumero.get(e.actoNumero);
				g = {
					id: meta?.id ?? null,
					numero: e.actoNumero,
					titulo: meta?.titulo ?? e.actoTitulo,
					duracionSegundos: meta?.duracionSegundos ?? null,
					escenas: []
				};
				groups.set(e.actoNumero, g);
			}
			g.escenas.push(e);
		}
		return Array.from(groups.values()).sort((a, b) => a.numero - b.numero);
	});

	const singleActo = $derived(actos.length === 1);
	const proyectoDuracion = $derived(
		(data.proyecto as { duracionEstimadaSegundos?: number | null }).duracionEstimadaSegundos ??
			null
	);

	// Cascade: si el acto tiene duración → toca a sus escenas. Si no, pero el proyecto
	// tiene duración → toca a TODAS las escenas del proyecto. Si nada, null.
	const escenaDuracionById = $derived.by(() => {
		const map = new Map<number, number | null>();
		const totalEscenas = data.escenas.length;

		for (const a of actos) {
			if (a.duracionSegundos !== null && a.escenas.length > 0) {
				const perEscena = Math.round(a.duracionSegundos / a.escenas.length);
				for (const e of a.escenas) map.set(e.id, perEscena);
			} else if (proyectoDuracion !== null && totalEscenas > 0) {
				const perEscena = Math.round(proyectoDuracion / totalEscenas);
				for (const e of a.escenas) map.set(e.id, perEscena);
			} else {
				for (const e of a.escenas) map.set(e.id, null);
			}
		}
		return map;
	});
</script>

<section class="page">
	<header class="header">
		<h1>
			<BookOpen size={22} strokeWidth={2} />
			<span>Historia</span>
		</h1>
		{@render scriptBlock()}
	</header>

	<div class="content-stack">
		{#if data.escenas.length > 0}
			<div class="meta">
				{#if singleActo}
					<span>
						{data.escenas.length}
						{data.escenas.length === 1 ? 'escena' : 'escenas'}
					</span>
				{:else}
					<span>{actos.length} actos · {data.escenas.length} escenas</span>
				{/if}
				<span class="meta-sep">·</span>
				{@render proyectoDuracionChip()}
			</div>
			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}
		{/if}

		{#if data.escenas.length === 0 && data.script}
		<div class="empty">
			<p>Aún no hay desglose de escenas para este proyecto.</p>
			<a class="generate-btn" href={`/proyectos/${data.proyecto.id}/script/build`}>
				<Zap size={16} strokeWidth={2.2} />
				<span>Construir desde el script</span>
			</a>
		</div>
	{:else if singleActo}
		<ol class="escenas-list">
			{#each actos[0].escenas as e (e.id)}
				{@render escenaCard(e)}
			{/each}
		</ol>
	{:else}
		<div class="actos">
			{#each actos as a (a.numero)}
				<section class="acto" class:collapsed={collapsedActos[a.numero]}>
					<div
						class="acto-header"
						role="button"
						tabindex="0"
						aria-expanded={!collapsedActos[a.numero]}
						onclick={() => toggleActo(a.numero)}
						onkeydown={(e) => handleActoKeydown(e, a.numero)}
					>
						<ChevronDown size={18} strokeWidth={2.2} class="chevron" />
						<span class="acto-label">Acto {a.numero}</span>
						{#if a.titulo}
							<h2 class="acto-titulo">{a.titulo}</h2>
						{:else}
							<span class="acto-spacer"></span>
						{/if}
						{#if a.id !== null}
							{@render duracionChip(a)}
						{/if}
						<span class="acto-count">
							{a.escenas.length}
							{a.escenas.length === 1 ? 'escena' : 'escenas'}
						</span>
					</div>

					{#if !collapsedActos[a.numero]}
						<ol class="escenas-list" transition:slide={{ duration: 200 }}>
							{#each a.escenas as e (e.id)}
								{@render escenaCard(e)}
							{/each}
						</ol>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
	</div>
</section>

{#snippet duracionChip(a: Acto)}
	{#if editingDuracionActoId === a.id}
		<form
			method="POST"
			action="?/updateActoDuracion"
			class="duracion-form"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			use:enhance={() =>
				async ({ update, result }) => {
					await update({ reset: false });
					if (result.type === 'success') cancelEditDuracion();
				}}
		>
			<input type="hidden" name="actoId" value={a.id} />
			<input
				bind:this={duracionInputEl}
				name="duracion"
				type="text"
				class="duracion-input"
				placeholder="30m · 1h 30m · 30:45"
				bind:value={duracionInput}
				onkeydown={handleDuracionKeydown}
				maxlength="20"
			/>
			<button type="submit" class="icon-btn save" aria-label="Guardar">
				<Check size={13} strokeWidth={2.4} />
			</button>
			<button
				type="button"
				class="icon-btn"
				onclick={cancelEditDuracion}
				aria-label="Cancelar"
			>
				<X size={13} strokeWidth={2.4} />
			</button>
		</form>
	{:else}
		<button
			type="button"
			class="duracion-chip"
			class:duracion-vacia={a.duracionSegundos === null}
			onclick={(e) => {
				e.stopPropagation();
				if (a.id !== null) startEditDuracion(a.id, a.duracionSegundos);
			}}
			aria-label="Editar duración del acto"
		>
			<Clock size={12} strokeWidth={2.2} />
			<span>{a.duracionSegundos !== null ? formatDuracion(a.duracionSegundos) : 'Sin duración'}</span>
			<Pencil size={11} strokeWidth={2.2} class="pencil" />
		</button>
	{/if}
{/snippet}

{#snippet proyectoDuracionChip()}
	{#if editingDuracionProyecto}
		<form
			method="POST"
			action="?/updateProyectoDuracion"
			class="duracion-form"
			use:enhance={() =>
				async ({ update, result }) => {
					await update({ reset: false });
					if (result.type === 'success') cancelEditDuracionProyecto();
				}}
		>
			<input
				bind:this={duracionProyectoInputEl}
				name="duracion"
				type="text"
				class="duracion-input"
				placeholder="1h 30m · 90m · 1:30:00"
				bind:value={duracionProyectoInput}
				onkeydown={handleDuracionProyectoKeydown}
				maxlength="20"
			/>
			<button type="submit" class="icon-btn save" aria-label="Guardar">
				<Check size={13} strokeWidth={2.4} />
			</button>
			<button
				type="button"
				class="icon-btn"
				onclick={cancelEditDuracionProyecto}
				aria-label="Cancelar"
			>
				<X size={13} strokeWidth={2.4} />
			</button>
		</form>
	{:else}
		<button
			type="button"
			class="duracion-chip proyecto-chip"
			class:duracion-vacia={proyectoDuracion === null}
			onclick={() => startEditDuracionProyecto(proyectoDuracion)}
			aria-label="Editar duración total del proyecto"
		>
			<Clock size={12} strokeWidth={2.2} />
			<span>
				{proyectoDuracion !== null
					? `${formatDuracion(proyectoDuracion)} total`
					: 'Sin duración total'}
			</span>
			<Pencil size={11} strokeWidth={2.2} class="pencil" />
		</button>
	{/if}
{/snippet}

{#snippet escenaCard(e: Escena)}
	{@const derivedDuracion = escenaDuracionById.get(e.id) ?? null}
	<li class="escena-card">
		<div class="escena-side">
			<div class="escena-numero">{e.numero}</div>
			<a
				class="open-btn"
				href={`/proyectos/${data.proyecto.id}/escenas/${e.id}`}
				aria-label="Abrir escena"
			>
				<Clapperboard size={16} strokeWidth={2.2} />
			</a>
		</div>
		<div class="escena-body">
			<div class="escena-head">
				<h3 class="escena-titulo">{e.titulo || 'Sin título'}</h3>
				{#if derivedDuracion !== null}
					<span class="escena-duracion" title="Duración estimada derivada del acto/proyecto">
						<Clock size={11} strokeWidth={2.4} />
						≈ {formatDuracion(derivedDuracion)}
					</span>
				{/if}
			</div>
			<p class="escena-especificacion">{e.encabezado}</p>
			<p class="escena-descripcion">{e.descripcion}</p>

			<div class="meta-row">
				{#if e.escenarioId && e.escenarioNombre}
					<div class="meta-section">
						<MapPin size={14} strokeWidth={2.2} class="meta-icon" />
						<span class="meta-label">Escenario</span>
						<a
							class="chip chip-escenario"
							href="/proyectos/{data.proyecto.id}/escenarios#escenario-{e.escenarioId}"
						>
							{e.escenarioNombre}
							{#if e.escenarioFoto}
								<img
									class="escenario-preview"
									src={e.escenarioFoto}
									alt={e.escenarioNombre}
									loading="lazy"
								/>
							{/if}
						</a>
					</div>
				{/if}

				{#if e.personajes.length > 0}
					<div class="meta-section">
						<Users size={14} strokeWidth={2.2} class="meta-icon" />
						<span class="meta-label">Personajes</span>
						<div class="chips">
							{#each e.personajes as p (p.id)}
								<a
									class="chip chip-personaje"
									href="/proyectos/{data.proyecto.id}/personajes#personaje-{p.id}"
								>
									{p.nombre}
									{#if p.foto}
										<img
											class="personaje-preview"
											src={p.foto}
											alt={p.nombre}
											loading="lazy"
										/>
									{/if}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</li>
{/snippet}

{#snippet scriptBlock()}
	<section class="script-block">
		{#if !data.script && data.escenas.length === 0}
			<p class="script-intro">Carga o crea un script abajo para empezar.</p>
		{/if}

		<h2 class="script-title">Script</h2>

		{#if data.script}
			<div class="script-card">
				<div class="script-icon"><FileText size={22} strokeWidth={1.8} /></div>
				<div class="script-info">
					<strong class="script-name">{data.script.originalName}</strong>
					<span class="script-meta">
						{formatBytes(data.script.size)} · subido el {formatDate(data.script.uploadedAt)}
					</span>
				</div>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script/view`}
					aria-label="Visualizar script"
				>
					<Eye size={16} strokeWidth={2.2} />
				</a>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script/json`}
					aria-label="Ver JSON estructurado"
				>
					<Braces size={16} strokeWidth={2.2} />
				</a>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script/build`}
					aria-label="Construir JSON con IA"
				>
					<Zap size={16} strokeWidth={2.2} />
				</a>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script`}
					aria-label="Descargar script"
					download
				>
					<Download size={16} strokeWidth={2.2} />
				</a>
				<button
					type="button"
					class="action-btn"
					class:active={showUploadForm}
					onclick={() => (showUploadForm = !showUploadForm)}
					aria-label="Reemplazar script"
				>
					<Upload size={16} strokeWidth={2.2} />
				</button>
			</div>
		{/if}

		{#if !data.script && !showUploadForm}
			<div class="script-options">
				<a
					class="script-option create"
					href={`/proyectos/${data.proyecto.id}/script/create`}
				>
					<Sparkles size={16} strokeWidth={2.2} />
					<span>Crear Script</span>
				</a>
				<button
					type="button"
					class="script-option import"
					onclick={() => (showUploadForm = true)}
				>
					<FilePlus size={16} strokeWidth={2.2} />
					<span>Importar Script</span>
				</button>
			</div>

			{#if data.escenas.length === 0}
				<p class="script-after-hint">
					El camino más usual es partir de la creación de un script o bien de importar
					alguno existente. Sin embargo también puedes si así lo deseas iniciar
					desarrollando a los personajes o a los escenarios.
				</p>
				<div class="alt-paths">
					<a
						class="alt-path-btn"
						href={`/proyectos/${data.proyecto.id}/personajes`}
					>
						<Users size={16} strokeWidth={2.2} />
						<span>Personajes</span>
					</a>
					<a
						class="alt-path-btn"
						href={`/proyectos/${data.proyecto.id}/escenarios`}
					>
						<MapPin size={16} strokeWidth={2.2} />
						<span>Escenarios</span>
					</a>
				</div>
			{/if}
		{/if}

		{#if showUploadForm}
			<form
				method="POST"
				action="?/uploadScript"
				enctype="multipart/form-data"
				class="upload-form"
				use:enhance={() => {
					uploading = true;
					return async ({ update, result }) => {
						await update({ reset: false });
						uploading = false;
						if (result.type === 'success') {
							selectedName = '';
							if (fileInput) fileInput.value = '';
							showSuccess = true;
							showUploadForm = false;
							clearTimeout(successTimeout);
							successTimeout = setTimeout(() => (showSuccess = false), 3500);
						}
					};
				}}
			>
				<label class="file-picker">
					<input
						bind:this={fileInput}
						type="file"
						name="file"
						accept=".docx,.doc,.pdf"
						required
						onchange={handleFileChange}
						disabled={uploading}
					/>
					<span class="file-picker-label">
						{selectedName ||
							(data.script
								? 'Reemplazar archivo (.docx o .pdf)'
								: 'Selecciona un .docx o .pdf')}
					</span>
				</label>

				<button
					type="submit"
					class="upload-btn"
					disabled={uploading}
					onclick={(e) => {
						if (!selectedName) {
							e.preventDefault();
							fileInput?.click();
						}
					}}
				>
					<Upload size={16} strokeWidth={2.2} />
					<span>{uploading ? 'Subiendo…' : data.script ? 'Reemplazar Script' : 'Cargar Script'}</span>
				</button>
			</form>
		{/if}

		{#if showSuccess}
			<p class="success">
				<CheckCircle2 size={16} strokeWidth={2.4} />
				<span>Script subido correctamente</span>
			</p>
		{/if}
	</section>
{/snippet}

<style>
	.page {
		padding: 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 3.5rem;
	}

	.content-stack {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h1 {
		margin: 0;
		font-size: 1.6rem;
		letter-spacing: -0.005em;
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
	}

	.meta {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex-wrap: wrap;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.85rem;
		font-weight: 400;
	}

	.meta-sep {
		color: rgba(255, 255, 255, 0.3);
	}

	.meta-total {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: rgba(255, 255, 255, 0.7);
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		font-weight: 700;
	}

	.error {
		margin: 0.5rem 0 0;
		padding: 0.55rem 0.85rem;
		color: #fecaca;
		background: rgba(220, 38, 38, 0.12);
		border: 1px solid rgba(220, 38, 38, 0.32);
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 400;
	}

	.duracion-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.55rem;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.14);
		border: 1px solid rgba(37, 99, 235, 0.32);
		border-radius: 999px;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.duracion-chip:hover {
		background: rgba(37, 99, 235, 0.24);
		border-color: rgba(37, 99, 235, 0.5);
		color: #fff;
	}

	.duracion-chip.duracion-vacia {
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.14);
		font-style: italic;
		font-weight: 400;
	}

	.duracion-chip.duracion-vacia:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.85);
	}

	.duracion-chip.proyecto-chip {
		color: #fff;
		background: rgba(37, 99, 235, 0.28);
		border-color: rgba(37, 99, 235, 0.5);
	}

	.duracion-chip.proyecto-chip:hover {
		background: rgba(37, 99, 235, 0.4);
		border-color: rgba(37, 99, 235, 0.7);
	}

	.duracion-chip.proyecto-chip.duracion-vacia {
		color: rgba(255, 255, 255, 0.55);
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.16);
		font-weight: 400;
	}

	.escena-duracion {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.18rem 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		color: rgba(255, 255, 255, 0.55);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 999px;
		flex-shrink: 0;
	}

	.duracion-chip :global(.pencil) {
		opacity: 0;
		transition: opacity 0.18s ease;
	}

	.duracion-chip:hover :global(.pencil) {
		opacity: 0.75;
	}

	.duracion-form {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
	}

	.duracion-input {
		width: 12rem;
		padding: 0.3rem 0.6rem;
		font: inherit;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 6px;
		outline: none;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.duracion-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
		font-weight: 400;
	}

	.duracion-input:focus {
		border-color: rgba(37, 99, 235, 0.55);
		background: rgba(255, 255, 255, 0.09);
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.85);
		cursor: pointer;
		font: inherit;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.22);
	}

	.icon-btn.save {
		background: #2563EB;
		color: #fff;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.icon-btn.save:hover {
		background: #1D4ED8;
	}

	.acto-spacer {
		flex: 1;
	}

	.top-row {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.script-block {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		flex: 0 1 auto;
		min-width: 0;
		max-width: 100%;
	}

	.script-title {
		margin: 0;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(255, 255, 255, 0.45);
		font-weight: 700;
	}

	.script-intro {
		margin: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.98rem;
		font-weight: 700;
	}

	.script-intro-hint {
		margin: 0;
		max-width: 60ch;
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.88rem;
		line-height: 1.55;
		font-style: italic;
		font-weight: 400;
	}

	.script-after-hint {
		margin: 1rem 0 0;
		max-width: 88ch;
		color: rgba(255, 255, 255, 0.95);
		font-size: 1rem;
		line-height: 1.55;
		font-style: italic;
		font-weight: 400;
	}

	.alt-paths {
		display: inline-flex;
		gap: 0.7rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.alt-path-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.1rem;
		font: inherit;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		text-decoration: none;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.alt-path-btn:hover {
		background: rgba(37, 99, 235, 0.18);
		border-color: rgba(37, 99, 235, 0.42);
		color: #fff;
	}

	.script-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		max-width: 520px;
		padding: 0.6rem 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
	}

	.script-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: rgba(37, 99, 235, 0.18);
		color: #93c5fd;
		flex-shrink: 0;
	}

	.script-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		flex: 1;
	}

	.script-name {
		font-size: 0.85rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.script-meta {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.45rem;
		color: rgba(255, 255, 255, 0.85);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 7px;
		text-decoration: none;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.24);
	}

	.action-btn.active {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.32);
	}

	button.action-btn {
		font: inherit;
		cursor: pointer;
	}

	.upload-form {
		display: flex;
		gap: 0.6rem;
		align-items: stretch;
		flex-wrap: wrap;
	}

	.file-picker {
		flex: 1 1 280px;
		display: inline-flex;
		align-items: center;
		padding: 0.65rem 0.95rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px dashed rgba(255, 255, 255, 0.22);
		border-radius: 10px;
		cursor: pointer;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.file-picker:hover {
		border-color: rgba(255, 255, 255, 0.4);
		background: rgba(255, 255, 255, 0.07);
	}

	.file-picker input[type='file'] {
		display: none;
	}

	.file-picker-label {
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.92rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.1rem;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		font: inherit;
		cursor: pointer;
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease,
			opacity 0.18s ease;
	}

	.upload-btn:hover:not(:disabled) {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
	}

	.upload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	.success {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		padding: 0.5rem 0.85rem;
		color: #86efac;
		background: rgba(22, 163, 74, 0.15);
		border: 1px solid rgba(22, 163, 74, 0.32);
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.empty {
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

	.empty-hint {
		max-width: 60ch;
		margin: 0 auto !important;
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.88rem;
		line-height: 1.55;
		font-style: italic;
	}

	.generate-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.1rem;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		text-decoration: none;
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
	}

	.generate-btn:hover {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
	}

	.script-options {
		display: inline-flex;
		gap: 0.7rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.script-option {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1.2rem;
		font: inherit;
		border-radius: 10px;
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

	.actos {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.acto-header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.4rem 0.6rem 0.6rem;
		margin: 0 -0.6rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		cursor: pointer;
		user-select: none;
		transition: background 0.18s ease;
	}

	.acto-header:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.acto-header:focus-visible {
		outline: 1px solid rgba(255, 255, 255, 0.3);
		outline-offset: 2px;
	}

	.acto-header :global(.chevron) {
		color: rgba(255, 255, 255, 0.55);
		flex-shrink: 0;
		transition: transform 0.22s ease;
	}

	.acto.collapsed .acto-header :global(.chevron) {
		transform: rotate(-90deg);
	}

	.acto-label {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(255, 255, 255, 0.55);
		flex-shrink: 0;
	}

	.acto-titulo {
		margin: 0;
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.96);
		letter-spacing: 0.005em;
		text-shadow:
			0 0 10px rgba(255, 255, 255, 0.22),
			0 0 22px rgba(255, 255, 255, 0.1);
		flex: 1;
	}

	.acto-count {
		font-size: 0.78rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.escenas-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.escena-card {
		display: flex;
		gap: 1rem;
		padding: 1rem 1.15rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.escena-side {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.escena-numero {
		flex-shrink: 0;
		width: 2.4rem;
		height: 2.4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: rgba(37, 99, 235, 0.18);
		color: #93c5fd;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
	}

	.escena-body {
		flex: 1;
		min-width: 0;
	}

	.escena-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.15rem;
	}

	.escena-titulo {
		margin: 0;
		font-size: 1.05rem;
		color: rgba(255, 255, 255, 0.96);
		flex: 1;
	}

	.open-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem 0.5rem;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 8px;
		text-decoration: none;
		box-shadow: 0 3px 12px rgba(37, 99, 235, 0.32);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease,
			transform 0.12s ease;
		flex-shrink: 0;
	}

	.open-btn:hover {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 5px 16px rgba(37, 99, 235, 0.45);
	}

	.open-btn:active {
		transform: scale(0.96);
	}

	.escena-especificacion {
		margin: 0 0 0.65rem;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.55);
	}

	.escena-descripcion {
		margin: 0 0 0.75rem;
		font-size: 0.92rem;
		font-weight: 400;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.86);
	}

	.escena-descripcion:last-child {
		margin-bottom: 0;
	}

	.meta-row {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		align-items: flex-start;
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
		position: relative;
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.12);
		border: 1px solid rgba(37, 99, 235, 0.3);
	}

	.personaje-preview {
		position: absolute;
		display: none;
		bottom: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		max-width: 280px;
		max-height: 200px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.22);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}

	.chip-personaje:hover .personaje-preview {
		display: block;
	}

	.chip-personaje:hover {
		background: rgba(37, 99, 235, 0.24);
		border-color: rgba(37, 99, 235, 0.55);
		color: #fff;
	}

	.chip-escenario {
		position: relative;
		color: rgba(255, 255, 255, 0.92);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.16);
	}

	.escenario-preview {
		position: absolute;
		display: none;
		bottom: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		max-width: 280px;
		max-height: 200px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.22);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}

	.chip-escenario:hover .escenario-preview {
		display: block;
	}

	.chip-escenario:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.28);
		color: #fff;
	}
</style>
