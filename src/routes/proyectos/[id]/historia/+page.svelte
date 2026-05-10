<script lang="ts">
	import { BookOpen, Zap } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Escena = (typeof data.escenas)[number];
	type Acto = { numero: number; titulo: string; escenas: Escena[] };

	const actos: Acto[] = $derived.by(() => {
		const groups = new Map<number, Acto>();
		for (const e of data.escenas) {
			let g = groups.get(e.actoNumero);
			if (!g) {
				g = { numero: e.actoNumero, titulo: e.actoTitulo, escenas: [] };
				groups.set(e.actoNumero, g);
			}
			g.escenas.push(e);
		}
		return Array.from(groups.values()).sort((a, b) => a.numero - b.numero);
	});
</script>

<section class="page">
	<header class="header">
		<h1>
			<BookOpen size={22} strokeWidth={2} />
			<span>Historia</span>
		</h1>
		{#if data.escenas.length > 0}
			<p class="meta">
				{actos.length}
				{actos.length === 1 ? 'acto' : 'actos'} · {data.escenas.length} escenas
			</p>
		{/if}
	</header>

	{#if data.escenas.length === 0}
		<div class="empty">
			<p>Aún no hay desglose de escenas para este proyecto.</p>
			<a class="generate-btn" href={`/proyectos/${data.proyecto.id}/script/build`}>
				<Zap size={16} strokeWidth={2.2} />
				<span>Construir desde el script</span>
			</a>
		</div>
	{:else}
		<div class="actos">
			{#each actos as a (a.numero)}
				<section class="acto">
					<header class="acto-header">
						<span class="acto-label">Acto {a.numero}</span>
						{#if a.titulo}
							<h2 class="acto-titulo">{a.titulo}</h2>
						{/if}
					</header>

					<ol class="escenas-list">
						{#each a.escenas as e (e.id)}
							<li class="escena-card">
								<div class="escena-numero">{e.numero}</div>
								<div class="escena-body">
									<h3 class="escena-titulo">{e.titulo || 'Sin título'}</h3>
									<p class="escena-especificacion">{e.encabezado}</p>
									<p class="escena-descripcion">{e.descripcion}</p>
									{#if e.personajes.length > 0}
										<ul class="personajes">
											{#each e.personajes as p}
												<li>{p}</li>
											{/each}
										</ul>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				</section>
			{/each}
		</div>
	{/if}
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
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

	.actos {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.acto-header {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		padding-bottom: 0.6rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

	.escena-titulo {
		margin: 0 0 0.15rem;
		font-size: 1.05rem;
		color: rgba(255, 255, 255, 0.96);
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

	.personajes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.personajes li {
		padding: 0.3rem 0.7rem;
		font-size: 0.78rem;
		color: #93c5fd;
		background: rgba(37, 99, 235, 0.12);
		border: 1px solid rgba(37, 99, 235, 0.3);
		border-radius: 999px;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
</style>
