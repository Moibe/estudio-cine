<script lang="ts">
	import { ArrowLeft, Download } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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
	<a href="/proyectos/{data.proyecto.id}" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>{data.proyecto.titulo}</span>
	</a>

	<header class="header">
		<div class="title-row">
			<h1>{data.script.originalName}</h1>
			<a
				class="action-btn"
				href={`/proyectos/${data.proyecto.id}/script`}
				aria-label="Descargar archivo original"
				download
			>
				<Download size={16} strokeWidth={2.2} />
			</a>
		</div>
		<p class="meta">
			{formatBytes(data.script.size)} · subido el {formatDate(data.script.uploadedAt)}
		</p>
	</header>

	<article class="script-content">
		{@html data.html}
	</article>
</section>

<style>
	.page {
		padding: 2rem 2.5rem 4rem;
		max-width: 920px;
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

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	h1 {
		margin: 0;
		font-size: 1.6rem;
		letter-spacing: -0.005em;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		margin: 0.4rem 0 0;
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.85rem;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem 0.55rem;
		color: rgba(255, 255, 255, 0.85);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		text-decoration: none;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.24);
	}

	.script-content {
		margin-top: 1.75rem;
		padding: 2.25rem 2.75rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 14px;
		color: rgba(255, 255, 255, 0.92);
		font-weight: 400;
		line-height: 1.65;
		font-size: 0.98rem;
	}

	/* Mammoth output styling — overrides for the HTML mammoth produces from .docx */
	.script-content :global(p) {
		margin: 0 0 0.85rem;
	}

	.script-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.script-content :global(h1),
	.script-content :global(h2),
	.script-content :global(h3),
	.script-content :global(h4) {
		margin: 1.6rem 0 0.7rem;
		color: #fff;
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	.script-content :global(h1) {
		font-size: 1.35rem;
	}
	.script-content :global(h2) {
		font-size: 1.2rem;
	}
	.script-content :global(h3) {
		font-size: 1.08rem;
	}
	.script-content :global(h4) {
		font-size: 1rem;
	}

	.script-content :global(strong) {
		color: #fff;
		font-weight: 700;
	}

	.script-content :global(em) {
		color: rgba(255, 255, 255, 0.95);
		font-style: italic;
	}

	.script-content :global(ul),
	.script-content :global(ol) {
		margin: 0.85rem 0;
		padding-left: 1.5rem;
	}

	.script-content :global(li) {
		margin-bottom: 0.35rem;
	}

	.script-content :global(blockquote) {
		margin: 1rem 0;
		padding: 0.6rem 1rem;
		border-left: 3px solid rgba(37, 99, 235, 0.6);
		background: rgba(37, 99, 235, 0.08);
		border-radius: 0 8px 8px 0;
		color: rgba(255, 255, 255, 0.85);
	}

	.script-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	.script-content :global(th),
	.script-content :global(td) {
		padding: 0.55rem 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		text-align: left;
	}

	.script-content :global(th) {
		background: rgba(255, 255, 255, 0.05);
		font-weight: 700;
	}

	.script-content :global(a) {
		color: #93c5fd;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.script-content :global(a:hover) {
		color: #bfdbfe;
	}

	.script-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		margin: 0.6rem 0;
	}
</style>
