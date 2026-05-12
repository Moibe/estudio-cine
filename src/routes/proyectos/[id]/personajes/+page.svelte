<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Check, Clapperboard, GripVertical, Plus, Users, X } from '@lucide/svelte';
	import { dndzone } from 'svelte-dnd-action';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let creating = $state(false);
	let nombre = $state('');
	let nombreInputEl: HTMLInputElement | undefined = $state();

	let items = $state(data.personajes);
	let dragging = $state(false);

	$effect(() => {
		if (dragging) return;

		const sameOrder =
			data.personajes.length === items.length &&
			data.personajes.every((p, i) => p.id === items[i].id);

		if (!sameOrder) {
			items = data.personajes;
			return;
		}

		for (let i = 0; i < data.personajes.length; i++) {
			const fresh = data.personajes[i];
			if (items[i].nombre !== fresh.nombre) items[i].nombre = fresh.nombre;
		}
	});

	$effect(() => {
		if (creating && nombreInputEl) nombreInputEl.focus();
	});

	function startCreate() {
		nombre = '';
		creating = true;
	}

	function cancelCreate() {
		creating = false;
		nombre = '';
	}

	function handleCreateKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelCreate();
	}

	function handleConsider(e: CustomEvent<{ items: typeof items }>) {
		dragging = true;
		items = e.detail.items;
	}

	async function handleFinalize(e: CustomEvent<{ items: typeof items }>) {
		items = e.detail.items;

		const ids = items.map((p) => p.id);
		const fd = new FormData();
		fd.append('ids', JSON.stringify(ids));

		await fetch('?/reorder', { method: 'POST', body: fd });
		await invalidateAll();

		dragging = false;
	}

	type EscenaRef = { id: number; numero: number; titulo: string };
	type PersonajeWithEscenas = {
		id: number;
		nombre: string;
		escenas: EscenaRef[];
	};

	const personajesWithEscenas: PersonajeWithEscenas[] = $derived.by(() => {
		return items.map((p) => {
			const escenasOfPersonaje = data.escenas
				.filter((e) => e.personajes.some((pp) => pp.id === p.id))
				.map((e) => ({ id: e.id, numero: e.numero, titulo: e.titulo }));
			return { id: p.id, nombre: p.nombre, escenas: escenasOfPersonaje };
		});
	});
</script>

<section class="page">
	<header class="header-row">
		<h1>
			<Users size={22} strokeWidth={2} />
			<span>Personajes</span>
		</h1>

		{#if creating}
			<form
				method="POST"
				action="?/create"
				class="create-form"
				use:enhance={() =>
					async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') cancelCreate();
					}}
			>
				<input
					bind:this={nombreInputEl}
					name="nombre"
					type="text"
					class="create-input"
					placeholder="Nombre del personaje"
					bind:value={nombre}
					onkeydown={handleCreateKeydown}
					required
					maxlength="200"
				/>
				<button type="submit" class="icon-btn save" aria-label="Crear">
					<Check size={16} strokeWidth={2.4} />
				</button>
				<button type="button" class="icon-btn" onclick={cancelCreate} aria-label="Cancelar">
					<X size={16} strokeWidth={2.4} />
				</button>
			</form>
		{:else}
			<button class="new-btn" onclick={startCreate}>
				<Plus size={16} strokeWidth={2.4} />
				<span>Nuevo Personaje</span>
			</button>
		{/if}
	</header>

	{#if data.personajes.length > 0}
		<p class="meta">
			{data.personajes.length}
			{data.personajes.length === 1 ? 'personaje' : 'personajes'}
		</p>
	{/if}

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}

	{#if data.personajes.length === 0}
		<div class="empty">
			<p>Aún no hay personajes registrados para este proyecto.</p>
		</div>
	{:else}
		<ul
			class="list"
			use:dndzone={{
				items,
				type: 'personajes',
				dropTargetStyle: {},
				flipDurationMs: 200,
				dragHandleSelector: '.drag-handle'
			}}
			onconsider={handleConsider}
			onfinalize={handleFinalize}
		>
			{#each personajesWithEscenas as p (p.id)}
				<li id="personaje-{p.id}" class="card">
					<div class="info">
						<button
							type="button"
							class="drag-handle"
							aria-label="Arrastrar para reordenar"
							tabindex="-1"
						>
							<GripVertical size={16} strokeWidth={2} />
						</button>
						<h2 class="nombre">{p.nombre}</h2>
						<div class="actions">
							<span class="apariciones">
								{p.escenas.length}
								{p.escenas.length === 1 ? 'escena' : 'escenas'}
							</span>
							<a
								class="open-btn"
								href={`/proyectos/${data.proyecto.id}/personajes/${p.id}`}
								aria-label="Abrir personaje"
							>
								<Clapperboard size={16} strokeWidth={2.2} />
							</a>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header-row {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		flex-wrap: wrap;
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
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.85rem;
		font-weight: 400;
	}

	.new-btn {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.1rem;
		font: inherit;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		cursor: pointer;
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
	}

	.new-btn:hover {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
	}

	.create-form {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.create-input {
		flex: 1 1 240px;
		padding: 0.65rem 0.9rem;
		font: inherit;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		outline: none;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.create-input::placeholder {
		color: rgba(255, 255, 255, 0.45);
		font-weight: 700;
	}

	.create-input:focus {
		border-color: rgba(255, 255, 255, 0.32);
		background: rgba(255, 255, 255, 0.08);
	}

	.icon-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		padding: 0.45rem;
		color: rgba(255, 255, 255, 0.85);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font: inherit;
		transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease,
			box-shadow 0.18s ease;
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
		box-shadow: 0 3px 12px rgba(37, 99, 235, 0.32);
	}

	.icon-btn.save:hover {
		background: #1D4ED8;
		box-shadow: 0 5px 16px rgba(37, 99, 235, 0.42);
	}

	.error {
		margin: 0;
		padding: 0.6rem 0.9rem;
		color: #fecaca;
		background: rgba(220, 38, 38, 0.12);
		border: 1px solid rgba(220, 38, 38, 0.32);
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 400;
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
		margin: 0;
		font-weight: 400;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.card {
		padding: 1rem 1.15rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		scroll-margin-top: 1rem;
		transition: border-color 0.4s ease, background 0.4s ease;
	}

	.card:target {
		border-color: rgba(37, 99, 235, 0.6);
		background: rgba(37, 99, 235, 0.1);
		animation: target-pulse 1.6s ease-out;
	}

	@keyframes target-pulse {
		0% {
			border-color: rgba(37, 99, 235, 0.9);
			background: rgba(37, 99, 235, 0.22);
		}
		100% {
			border-color: rgba(37, 99, 235, 0.6);
			background: rgba(37, 99, 235, 0.1);
		}
	}

	.info {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.nombre {
		flex: 1;
	}

	.drag-handle {
		background: transparent;
		border: none;
		padding: 0.25rem;
		color: rgba(255, 255, 255, 0.35);
		cursor: grab;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font: inherit;
		transition: color 0.18s ease;
		touch-action: none;
		flex-shrink: 0;
	}

	.drag-handle:hover {
		color: rgba(255, 255, 255, 0.85);
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.nombre {
		margin: 0;
		font-size: 1.1rem;
		color: #93c5fd;
		letter-spacing: 0.02em;
	}

	.apariciones {
		font-size: 0.8rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.55);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.85rem;
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
	}

	.open-btn:hover {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 5px 16px rgba(37, 99, 235, 0.45);
	}

	.open-btn:active {
		transform: scale(0.96);
	}

	.escenas {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.escena-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.7rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.78rem;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.escena-pill:hover {
		background: rgba(37, 99, 235, 0.18);
		border-color: rgba(37, 99, 235, 0.42);
		color: #fff;
	}

	.escena-pill .num {
		font-weight: 700;
		color: rgba(255, 255, 255, 0.55);
	}

	.escena-pill:hover .num {
		color: #93c5fd;
	}

	.escena-pill .title {
		font-weight: 400;
	}
</style>
