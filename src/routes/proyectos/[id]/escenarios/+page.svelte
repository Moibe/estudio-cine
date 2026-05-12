<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		Check,
		Clapperboard,
		GripVertical,
		Map as MapIcon,
		Pencil,
		Plus,
		X
	} from '@lucide/svelte';
	import { dndzone } from 'svelte-dnd-action';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let editingId = $state<number | null>(null);
	let editingNombre = $state('');
	let editInputEl: HTMLInputElement | undefined = $state();

	let creating = $state(false);
	let newNombre = $state('');
	let newNombreInputEl: HTMLInputElement | undefined = $state();

	let items = $state(data.escenarios);
	let dragging = $state(false);

	$effect(() => {
		if (dragging) return;

		const sameOrder =
			data.escenarios.length === items.length &&
			data.escenarios.every((esc, i) => esc.id === items[i].id);

		if (!sameOrder) {
			items = data.escenarios;
			return;
		}

		for (let i = 0; i < data.escenarios.length; i++) {
			const fresh = data.escenarios[i];
			if (items[i].nombre !== fresh.nombre) items[i].nombre = fresh.nombre;
		}
	});

	$effect(() => {
		if (editingId !== null && editInputEl) editInputEl.focus();
	});

	$effect(() => {
		if (creating && newNombreInputEl) newNombreInputEl.focus();
	});

	function startEdit(id: number, currentNombre: string) {
		editingId = id;
		editingNombre = currentNombre;
	}

	function cancelEdit() {
		editingId = null;
		editingNombre = '';
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelEdit();
	}

	function startCreate() {
		newNombre = '';
		creating = true;
	}

	function cancelCreate() {
		creating = false;
		newNombre = '';
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

		const ids = items.map((esc) => esc.id);
		const fd = new FormData();
		fd.append('ids', JSON.stringify(ids));

		await fetch('?/reorder', { method: 'POST', body: fd });
		await invalidateAll();

		dragging = false;
	}

	type EscenaRef = { id: number; numero: number; titulo: string; encabezado: string };
	type EscenarioWithEscenas = {
		id: number;
		nombre: string;
		escenas: EscenaRef[];
	};

	const escenariosWithEscenas: EscenarioWithEscenas[] = $derived.by(() => {
		return items.map((esc) => {
			const escenasInEscenario = data.escenas
				.filter((e) => e.escenarioId === esc.id)
				.map((e) => ({
					id: e.id,
					numero: e.numero,
					titulo: e.titulo,
					encabezado: e.encabezado
				}));
			return { id: esc.id, nombre: esc.nombre, escenas: escenasInEscenario };
		});
	});
</script>

<section class="page">
	<header class="header-row">
		<h1>
			<MapIcon size={22} strokeWidth={2} />
			<span>Escenarios</span>
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
					bind:this={newNombreInputEl}
					name="nombre"
					type="text"
					class="create-input"
					placeholder="Nombre del escenario"
					bind:value={newNombre}
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
				<span>Nuevo Escenario</span>
			</button>
		{/if}
	</header>

	{#if data.escenarios.length > 0}
		<p class="meta">
			{data.escenarios.length}
			{data.escenarios.length === 1 ? 'escenario' : 'escenarios'}
		</p>
	{/if}

	{#if data.escenarios.length === 0}
		<div class="empty">
			<p>Aún no hay escenarios registrados para este proyecto.</p>
		</div>
	{:else}
		<ul
			class="list"
			use:dndzone={{
				items,
				type: 'escenarios',
				dragDisabled: editingId !== null,
				dropTargetStyle: {},
				flipDurationMs: 200,
				dragHandleSelector: '.drag-handle'
			}}
			onconsider={handleConsider}
			onfinalize={handleFinalize}
		>
			{#each escenariosWithEscenas as esc (esc.id)}
				<li id="escenario-{esc.id}" class="card">
					{#if editingId === esc.id}
						<form
							method="POST"
							action="?/updateNombre"
							class="edit-form"
							use:enhance={() =>
								async ({ update, result }) => {
									await update({ reset: false });
									if (result.type === 'success') cancelEdit();
								}}
						>
							<input type="hidden" name="id" value={esc.id} />
							<input
								bind:this={editInputEl}
								name="nombre"
								type="text"
								class="edit-input"
								bind:value={editingNombre}
								onkeydown={handleEditKeydown}
								required
								maxlength="200"
							/>
							<div class="edit-actions">
								<button type="submit" class="icon-btn save" aria-label="Guardar">
									<Check size={16} strokeWidth={2.4} />
								</button>
								<button
									type="button"
									class="icon-btn"
									onclick={cancelEdit}
									aria-label="Cancelar"
								>
									<X size={16} strokeWidth={2.4} />
								</button>
							</div>
						</form>
					{:else}
						<div class="info">
							<button
								type="button"
								class="drag-handle"
								aria-label="Arrastrar para reordenar"
								tabindex="-1"
							>
								<GripVertical size={16} strokeWidth={2} />
							</button>
							<h2 class="nombre">{esc.nombre}</h2>
							<div class="actions">
								<span class="apariciones">
									{esc.escenas.length}
									{esc.escenas.length === 1 ? 'escena' : 'escenas'}
								</span>
								<button
									type="button"
									class="edit-btn"
									onclick={() => startEdit(esc.id, esc.nombre)}
									aria-label="Editar nombre"
								>
									<Pencil size={15} strokeWidth={2.2} />
								</button>
								<a
									class="open-btn"
									href={`/proyectos/${data.proyecto.id}/escenarios/${esc.id}`}
									aria-label="Abrir escenario"
								>
									<Clapperboard size={16} strokeWidth={2.2} />
								</a>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
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
		margin: 0;
		font-size: 1.05rem;
		color: rgba(255, 255, 255, 0.96);
		letter-spacing: 0.005em;
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

	.edit-btn {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 0.3rem;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font: inherit;
		transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
	}

	.edit-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.95);
		border-color: rgba(255, 255, 255, 0.14);
	}

	.edit-form {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex: 1;
	}

	.edit-input {
		flex: 1;
		padding: 0.45rem 0.75rem;
		font: inherit;
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 8px;
		outline: none;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.edit-input:focus {
		border-color: rgba(255, 255, 255, 0.32);
		background: rgba(255, 255, 255, 0.08);
	}

	.edit-actions {
		display: flex;
		gap: 0.4rem;
	}

	.icon-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		padding: 0.4rem;
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
