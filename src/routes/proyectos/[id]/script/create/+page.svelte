<script lang="ts">
	import { ArrowLeft, Sparkles } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="page">
	<a href="/proyectos/{data.proyecto.id}/historia" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>Historia</span>
	</a>

	<header class="header">
		<Sparkles size={20} strokeWidth={2} class="header-icon" />
		<h1>Crear Script</h1>
	</header>

	<div class="placeholder">
		<p>
			Aquí irá el editor inline para escribir un script desde cero — sin necesidad de
			importar un .docx.
		</p>
		<p class="hint">
			Próximamente. Por ahora, vuelve atrás y usa <strong>Importar Script</strong> con un
			archivo .docx.
		</p>
	</div>
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
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
		color: rgba(255, 255, 255, 0.85);
		flex-shrink: 0;
	}

	h1 {
		margin: 0;
		font-size: 1.7rem;
		letter-spacing: -0.005em;
	}

	.placeholder {
		padding: 2rem 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.18);
		border-radius: 14px;
		color: rgba(255, 255, 255, 0.7);
	}

	.placeholder p {
		margin: 0;
		font-weight: 400;
		line-height: 1.6;
	}

	.placeholder p + p {
		margin-top: 0.85rem;
	}

	.hint {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.92rem;
	}

	.placeholder strong {
		color: rgba(255, 255, 255, 0.85);
	}
</style>
