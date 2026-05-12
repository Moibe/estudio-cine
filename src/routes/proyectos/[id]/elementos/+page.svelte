<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Boxes, Check, Clapperboard, GripVertical, Plus, X } from '@lucide/svelte';
	import { dndzone } from 'svelte-dnd-action';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let creating = $state(false);
	let nombre = $state('');
	let nombreInputEl: HTMLInputElement | undefined = $state();

	let items = $state(data.elementos);
	let dragging = $state(false);

	$effect(() => {
		if (dragging) return;

		const sameOrder =
			data.elementos.length === items.length &&
			data.elementos.every((e, i) => e.id === items[i].id);

		if (!sameOrder) {
			items = data.elementos;
			return;
		}

		for (let i = 0; i < data.elementos.length; i++) {
			const fresh = data.elementos[i];
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

		const ids = items.map((el) => el.id);
		const fd = new FormData();
		fd.append('ids', JSON.stringify(ids));

		await fetch('?/reorder', { method: 'POST', body: fd });
		await invalidateAll();

		dragging = false;
	}
</script>

<section class="page">
	<header class="header-row">
		<h1>
			<Boxes size={22} strokeWidth={2} />
			<span>Elementos</span>
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
					placeholder="Nombre del elemento"
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
				<span>Nuevo Elemento</span>
			</button>
		{/if}
	</header>

	{#if items.length > 0}
		<p class="meta">
			{items.length}
			{items.length === 1 ? 'elemento' : 'elementos'}
		</p>
	{/if}

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}

	{#if items.length === 0}
		<div class="empty">
			<p>Aún no hay elementos registrados para este proyecto.</p>
		</div>
	{:else}
		<ul
			class="list"
			use:dndzone={{
				items,
				type: 'elementos',
				dropTargetStyle: {},
				flipDurationMs: 200,
				dragHandleSelector: '.drag-handle'
			}}
			onconsider={handleConsider}
			onfinalize={handleFinalize}
		>
			{#each items as el (el.id)}
				<li class="card">
					<button
						type="button"
						class="drag-handle"
						aria-label="Arrastrar para reordenar"
						tabindex="-1"
					>
						<GripVertical size={16} strokeWidth={2} />
					</button>
					<a
						class="open-btn"
						href={`/proyectos/${data.proyecto.id}/elementos/${el.id}`}
						aria-label="Abrir elemento"
					>
						<Clapperboard size={16} strokeWidth={2.2} />
					</a>
					<h2 class="nombre">{el.nombre}</h2>
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
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.15rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
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

	.nombre {
		margin: 0;
		font-size: 1.05rem;
		color: rgba(255, 255, 255, 0.96);
		letter-spacing: 0.005em;
	}
</style>
