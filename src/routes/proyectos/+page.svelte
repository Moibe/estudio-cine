<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let creating = $state(false);
	let titulo = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (creating && inputEl) inputEl.focus();
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

	<ul class="list">
		{#each data.proyectos as p (p.id)}
			<li class="card">
				<span class="title">{p.titulo}</span>
				<span class="date">
					{new Date(p.createdAt).toLocaleDateString('es-MX', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})}
				</span>
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
	}

	.card .title {
		font-size: 1rem;
	}

	.card .date {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.empty {
		color: rgba(255, 255, 255, 0.65);
		padding: 1rem 0;
	}
</style>
