<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, Box, Check, Pencil, X } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let editing = $state(false);
	let editingDescripcion = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		if (editing && textareaEl) textareaEl.focus();
	});

	function startEdit() {
		editingDescripcion = data.elemento.descripcion;
		editing = true;
	}

	function cancelEdit() {
		editing = false;
		editingDescripcion = '';
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelEdit();
	}
</script>

<section class="page">
	<a href="/proyectos/{data.proyecto.id}/elementos" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>Elementos</span>
	</a>

	<header class="header">
		<Box size={20} strokeWidth={2} class="header-icon" />
		<h1>{data.elemento.nombre}</h1>
	</header>

	<section class="block">
		<div class="block-header">
			<h2>Descripción</h2>
			{#if !editing}
				<button
					type="button"
					class="edit-btn"
					onclick={startEdit}
					aria-label="Editar descripción"
				>
					<Pencil size={14} strokeWidth={2.2} />
				</button>
			{/if}
		</div>

		{#if editing}
			<form
				method="POST"
				action="?/updateDescripcion"
				class="edit-form"
				use:enhance={() =>
					async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') cancelEdit();
					}}
			>
				<textarea
					bind:this={textareaEl}
					name="descripcion"
					class="edit-textarea"
					bind:value={editingDescripcion}
					onkeydown={handleEditKeydown}
					rows="6"
				></textarea>
				<div class="edit-actions">
					<button type="submit" class="icon-btn save" aria-label="Guardar">
						<Check size={16} strokeWidth={2.4} />
					</button>
					<button type="button" class="icon-btn" onclick={cancelEdit} aria-label="Cancelar">
						<X size={16} strokeWidth={2.4} />
					</button>
				</div>
			</form>
		{:else if data.elemento.descripcion}
			<p class="descripcion">{data.elemento.descripcion}</p>
		{:else}
			<p class="descripcion-vacia">Sin descripción todavía.</p>
		{/if}
	</section>
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
		align-items: center;
		gap: 0.7rem;
		margin-top: 0.5rem;
	}

	.header :global(.header-icon) {
		color: rgba(255, 255, 255, 0.7);
		flex-shrink: 0;
	}

	h1 {
		margin: 0;
		font-size: 1.7rem;
		letter-spacing: -0.005em;
	}

	.block-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.85rem;
	}

	.block-header h2 {
		margin: 0;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.45);
		font-weight: 700;
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
		gap: 0.6rem;
		align-items: flex-start;
	}

	.edit-textarea {
		flex: 1;
		min-height: 7rem;
		padding: 0.85rem 1.05rem;
		font: inherit;
		font-weight: 400;
		font-size: 0.95rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 12px;
		outline: none;
		resize: vertical;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.edit-textarea:focus {
		border-color: rgba(255, 255, 255, 0.32);
		background: rgba(255, 255, 255, 0.08);
	}

	.edit-actions {
		display: flex;
		flex-direction: column;
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
</style>
