<script lang="ts">
	import { Map as MapIcon, Zap } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type EscenaRef = { id: number; numero: number; titulo: string; encabezado: string };
	type EscenarioWithEscenas = {
		id: number;
		nombre: string;
		escenas: EscenaRef[];
	};

	const escenariosWithEscenas: EscenarioWithEscenas[] = $derived.by(() => {
		return data.escenarios
			.map((esc) => {
				const escenasInEscenario = data.escenas
					.filter((e) => e.escenarioId === esc.id)
					.map((e) => ({
						id: e.id,
						numero: e.numero,
						titulo: e.titulo,
						encabezado: e.encabezado
					}));
				return { id: esc.id, nombre: esc.nombre, escenas: escenasInEscenario };
			})
			.sort((a, b) => b.escenas.length - a.escenas.length);
	});
</script>

<section class="page">
	<header class="header">
		<h1>
			<MapIcon size={22} strokeWidth={2} />
			<span>Escenarios</span>
		</h1>
		{#if data.escenarios.length > 0}
			<p class="meta">
				{data.escenarios.length}
				{data.escenarios.length === 1 ? 'escenario' : 'escenarios'}
			</p>
		{/if}
	</header>

	{#if data.escenarios.length === 0}
		<div class="empty">
			<p>Aún no hay escenarios registrados para este proyecto.</p>
			<a class="generate-btn" href={`/proyectos/${data.proyecto.id}/script/build`}>
				<Zap size={16} strokeWidth={2.2} />
				<span>Construir desde el script</span>
			</a>
		</div>
	{:else}
		<ul class="list">
			{#each escenariosWithEscenas as esc (esc.id)}
				<li class="card">
					<div class="info">
						<h2 class="nombre">{esc.nombre}</h2>
						<span class="apariciones">
							{esc.escenas.length}
							{esc.escenas.length === 1 ? 'escena' : 'escenas'}
						</span>
					</div>
					{#if esc.escenas.length > 0}
						<ul class="escenas">
							{#each esc.escenas as e (e.id)}
								<a
									class="escena-pill"
									href={`/proyectos/${data.proyecto.id}/escenas/${e.id}`}
								>
									<span class="num">{e.numero}</span>
									<span class="title">{e.titulo || e.encabezado}</span>
								</a>
							{/each}
						</ul>
					{/if}
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

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
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
	}

	.info {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.nombre {
		margin: 0;
		font-size: 1.05rem;
		color: rgba(255, 255, 255, 0.96);
		letter-spacing: 0.005em;
	}

	.apariciones {
		font-size: 0.8rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.55);
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
