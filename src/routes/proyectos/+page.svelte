<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Pencil, Check, X, GripVertical, Clapperboard } from '@lucide/svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { tilt } from '$lib/actions/tilt';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let creating = $state(false);
	let titulo = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	let editingId = $state<number | null>(null);
	let editingTitle = $state('');
	let editInputEl: HTMLInputElement | undefined = $state();

	let items = $state(data.proyectos);
	let dragging = $state(false);

	$effect(() => {
		if (dragging) return;

		const sameOrder =
			data.proyectos.length === items.length &&
			data.proyectos.every((p, i) => p.id === items[i].id);

		if (!sameOrder) {
			items = data.proyectos;
			return;
		}

		for (let i = 0; i < data.proyectos.length; i++) {
			const fresh = data.proyectos[i];
			if (items[i].titulo !== fresh.titulo) items[i].titulo = fresh.titulo;
		}
	});

	$effect(() => {
		if (creating && inputEl) inputEl.focus();
	});

	$effect(() => {
		if (editingId !== null && editInputEl) editInputEl.focus();
	});

	$effect(() => {
		if (form?.success) {
			creating = false;
			titulo = '';
		}
	});

	function cancel() {
		creating = false;
		titulo = '';
	}

	function startEdit(id: number, current: string) {
		editingId = id;
		editingTitle = current;
	}

	function cancelEdit() {
		editingId = null;
		editingTitle = '';
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelEdit();
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
</script>

<section class="page">
	<h1>Proyectos</h1>

	{#if !creating}
		<button class="new-btn" onclick={() => (creating = true)}>
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<path
					d="M12 5v14M5 12h14"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					fill="none"
				/>
			</svg>
			Nuevo Proyecto
		</button>
	{:else}
		<form
			method="POST"
			action="?/create"
			class="new-form"
			use:enhance={() =>
				async ({ update }) => {
					await update({ reset: false });
				}}
		>
			<input
				bind:this={inputEl}
				name="titulo"
				type="text"
				placeholder="Título del proyecto"
				bind:value={titulo}
				required
				maxlength="200"
			/>
			<button type="submit" class="save-btn">Guardar</button>
			<button type="button" class="cancel-btn" onclick={cancel}>Cancelar</button>
		</form>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
	{/if}

	<ul
		class="list"
		use:dndzone={{
			items,
			type: 'proyectos',
			dragDisabled: editingId !== null,
			dropTargetStyle: {},
			flipDurationMs: 200,
			dragHandleSelector: '.drag-handle'
		}}
		onconsider={handleConsider}
		onfinalize={handleFinalize}
	>
		{#each items as p (p.id)}
			<li class="card" use:tilt={editingId === p.id || dragging ? { max: 0 } : undefined}>
				{#if editingId === p.id}
					<form
						method="POST"
						action="?/update"
						class="edit-form"
						use:enhance={() =>
							async ({ update, result }) => {
								await update({ reset: false });
								if (result.type === 'success') cancelEdit();
							}}
					>
						<input type="hidden" name="id" value={p.id} />
						<input
							bind:this={editInputEl}
							name="titulo"
							type="text"
							class="edit-input"
							bind:value={editingTitle}
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
						href={`/proyectos/${p.id}`}
						aria-label="Trabajar en este proyecto"
					>
						<Clapperboard size={16} strokeWidth={2.2} />
					</a>
					<span class="title">{p.titulo}</span>
					<div class="card-meta">
						<span class="date">
							{new Date(p.createdAt).toLocaleDateString('es-MX', {
								year: 'numeric',
								month: 'short',
								day: 'numeric'
							})}
						</span>
						<button
							type="button"
							class="edit-btn"
							onclick={() => startEdit(p.id, p.titulo)}
							aria-label="Editar nombre"
						>
							<Pencil size={15} strokeWidth={2.2} />
						</button>
					</div>
				{/if}
			</li>
		{:else}
			<li class="empty">Aún no has creado proyectos.</li>
		{/each}
	</ul>
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		max-width: 720px;
	}

	h1 {
		margin: 0 0 1.5rem;
		font-size: 1.75rem;
		letter-spacing: -0.01em;
	}

	.new-btn,
	.save-btn,
	.cancel-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.1rem;
		font: inherit;
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
	}

	.new-btn,
	.save-btn {
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
	}

	.new-btn:hover,
	.save-btn:hover {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
	}

	.cancel-btn {
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.14);
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.22);
	}

	.new-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.new-form input {
		flex: 1 1 240px;
		padding: 0.65rem 0.9rem;
		font: inherit;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 10px;
		outline: none;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.new-form input::placeholder {
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
	}

	.new-form input:focus {
		border-color: rgba(255, 255, 255, 0.32);
		background: rgba(255, 255, 255, 0.07);
	}

	.error {
		margin: 0.6rem 0 0;
		color: #fecaca;
		font-size: 0.9rem;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1.1rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		cursor: default;
	}

	.card .title {
		font-size: 1rem;
		flex: 1;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.card .date {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.85rem;
		white-space: nowrap;
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
	}

	.drag-handle:hover {
		color: rgba(255, 255, 255, 0.85);
	}

	.drag-handle:active {
		cursor: grabbing;
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

	.edit-form {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex: 1;
	}

	.edit-input {
		flex: 1;
		padding: 0.4rem 0.7rem;
		font: inherit;
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
		padding: 0.35rem;
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

	.empty {
		color: rgba(255, 255, 255, 0.65);
		padding: 1rem 0;
	}
</style>
