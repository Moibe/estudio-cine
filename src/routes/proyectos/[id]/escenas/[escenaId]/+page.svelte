<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="page">
	<a href="/proyectos/{data.escena.proyectoId}" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>Volver al proyecto</span>
	</a>

	<header class="header">
		<span class="numero">Escena {data.escena.numero}</span>
		<h1>{data.escena.titulo || data.escena.encabezado}</h1>
		{#if data.escena.titulo}
			<p class="spec">{data.escena.encabezado}</p>
		{/if}
	</header>

	<p class="descripcion">{data.escena.descripcion}</p>

	{#if data.escena.personajes.length > 0}
		<section class="block">
			<h2>Personajes</h2>
			<ul class="personajes">
				{#each data.escena.personajes as p}
					<li>{p}</li>
				{/each}
			</ul>
		</section>
	{/if}
</section>

<style>
	.page {
		padding: 2rem 2.5rem 4rem;
		max-width: 720px;
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

	.numero {
		display: inline-block;
		padding: 0.25rem 0.6rem;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 6px;
		margin-bottom: 0.65rem;
	}

	h1 {
		margin: 0;
		font-size: 1.7rem;
		letter-spacing: -0.005em;
	}

	.spec {
		margin: 0.45rem 0 0;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.descripcion {
		margin: 1.25rem 0 0;
		padding: 1rem 1.2rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.92);
		font-weight: 400;
		line-height: 1.6;
	}

	.block {
		margin-top: 2rem;
	}

	h2 {
		margin: 0 0 0.8rem;
		font-size: 1.05rem;
		color: rgba(255, 255, 255, 0.85);
	}

	.personajes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.personajes li {
		padding: 0.4rem 0.85rem;
		font-size: 0.85rem;
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.12);
		border: 1px solid rgba(37, 99, 235, 0.32);
		border-radius: 8px;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
</style>
