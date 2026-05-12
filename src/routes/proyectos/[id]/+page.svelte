<script lang="ts">
	import { enhance } from '$app/forms';
	import { Pencil, Check, X } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let editingTitulo = $state(false);
	let tituloValue = $state('');
	let tituloInputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (editingTitulo && tituloInputEl) tituloInputEl.focus();
	});

	function startEditTitulo() {
		tituloValue = data.proyecto.titulo;
		editingTitulo = true;
	}

	function cancelEditTitulo() {
		editingTitulo = false;
		tituloValue = '';
	}

	function handleTituloKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelEditTitulo();
	}

	function formatDate(d: Date | string): string {
		return new Date(d).toLocaleDateString('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<section class="page">
	<header class="header">
		{#if editingTitulo}
			<form
				method="POST"
				action="?/updateTitulo"
				class="titulo-edit-form"
				use:enhance={() =>
					async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') cancelEditTitulo();
					}}
			>
				<input
					bind:this={tituloInputEl}
					name="titulo"
					type="text"
					class="titulo-input"
					bind:value={tituloValue}
					onkeydown={handleTituloKeydown}
					required
					maxlength="200"
				/>
				<button type="submit" class="icon-btn save" aria-label="Guardar">
					<Check size={16} strokeWidth={2.4} />
				</button>
				<button
					type="button"
					class="icon-btn"
					onclick={cancelEditTitulo}
					aria-label="Cancelar"
				>
					<X size={16} strokeWidth={2.4} />
				</button>
			</form>
		{:else}
			<div class="titulo-row">
				<h1>{data.proyecto.titulo}</h1>
				<button
					type="button"
					class="titulo-edit-btn"
					onclick={startEditTitulo}
					aria-label="Editar título"
				>
					<Pencil size={15} strokeWidth={2.2} />
				</button>
			</div>
		{/if}
		<p class="meta">Creado el {formatDate(data.proyecto.createdAt)}</p>
	</header>
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		max-width: 920px;
	}

	.header {
		margin-top: 0;
	}

	.titulo-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.titulo-edit-btn {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 0.35rem;
		color: rgba(255, 255, 255, 0.45);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font: inherit;
		transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
	}

	.titulo-edit-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.95);
		border-color: rgba(255, 255, 255, 0.14);
	}

	.titulo-edit-form {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.titulo-input {
		flex: 1 1 240px;
		padding: 0.55rem 0.85rem;
		font: inherit;
		font-size: 1.5rem;
		letter-spacing: -0.01em;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		outline: none;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.titulo-input:focus {
		border-color: rgba(255, 255, 255, 0.32);
		background: rgba(255, 255, 255, 0.08);
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

	h1 {
		margin: 0 0 0.4rem;
		font-size: 2rem;
		letter-spacing: -0.01em;
	}

	.meta {
		margin: 0;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}
</style>
