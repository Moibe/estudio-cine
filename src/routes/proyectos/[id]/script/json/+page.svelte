<script lang="ts">
	import { ArrowLeft, Braces, Download, Zap } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const result = $derived.by(() => {
		if (data.escenas.length === 0) return null;
		const groups = new Map<
			number,
			{
				numero: number;
				titulo: string;
				escenas: Array<{
					numero: number;
					titulo: string;
					especificacion: string;
					escenario: string;
					descripcion: string;
					personajes: string[];
				}>;
			}
		>();
		for (const e of data.escenas) {
			let g = groups.get(e.actoNumero);
			if (!g) {
				g = { numero: e.actoNumero, titulo: e.actoTitulo, escenas: [] };
				groups.set(e.actoNumero, g);
			}
			g.escenas.push({
				numero: e.numero,
				titulo: e.titulo,
				especificacion: e.encabezado,
				escenario: e.escenarioNombre,
				descripcion: e.descripcion,
				personajes: e.personajes.map((p) => p.nombre)
			});
		}
		return {
			titulo: '',
			escenarios: data.escenarios.map((esc) => ({
				nombre: esc.nombre,
				descripcion: esc.descripcion
			})),
			personajes: data.personajes.map((p) => ({
				nombre: p.nombre,
				descripcion: p.descripcion
			})),
			actos: Array.from(groups.values()).sort((a, b) => a.numero - b.numero)
		};
	});

	const regeneratedAt = $derived<Date | null>(
		data.escenas?.[0]?.createdAt ? new Date(data.escenas[0].createdAt) : null
	);

	function jsonLines(obj: unknown): Array<{ indent: number; text: string }> {
		return JSON.stringify(obj, null, 2)
			.split('\n')
			.map((line) => {
				const m = line.match(/^( *)(.*)$/);
				return { indent: m?.[1].length ?? 0, text: m?.[2] ?? '' };
			});
	}

	function formatRegenDate(d: Date): string {
		return d.toLocaleString('es-MX', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function safeFilename(s: string): string {
		return s
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-zA-Z0-9-_]+/g, '_')
			.replace(/^_+|_+$/g, '');
	}

	function downloadJson() {
		if (!result) return;
		const json = JSON.stringify(result, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		a.download = `${safeFilename(data.proyecto.titulo)}-${ts}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<section class="page">
	<div class="top-bar">
		<a href="/proyectos/{data.proyecto.id}/historia" class="back">
			<ArrowLeft size={16} strokeWidth={2.2} />
			<span>Historia</span>
		</a>
		{#if result}
			<button type="button" class="save-btn" onclick={downloadJson}>
				<Download size={15} strokeWidth={2.2} />
				<span>Guardar</span>
			</button>
		{/if}
	</div>

	<header class="header">
		<h1>
			<Braces size={22} strokeWidth={2} />
			<span>JSON Estructurado</span>
		</h1>
		{#if result}
			<p class="meta">
				{result.actos.length}
				{result.actos.length === 1 ? 'acto' : 'actos'} ·
				{data.escenas.length} escenas
				{#if regeneratedAt}
					· generado {formatRegenDate(regeneratedAt)}
				{/if}
			</p>
		{/if}
	</header>

	{#if result}
		<div class="json-output">
			{#each jsonLines(result) as line, i (i)}
				<div class="json-line" style="--indent: {line.indent}">{line.text}</div>
			{/each}
		</div>
	{:else}
		<div class="empty">
			<p>Aún no hay JSON generado para este proyecto.</p>
			<a class="generate-btn" href={`/proyectos/${data.proyecto.id}/script/build`}>
				<Zap size={16} strokeWidth={2.2} />
				<span>Construir JSON</span>
			</a>
		</div>
	{/if}
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		height: 100%;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
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
		margin-top: 1rem;
		flex-shrink: 0;
	}

	h1 {
		margin: 0 0 0.4rem;
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

	.save-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.85rem;
		font: inherit;
		font-size: 0.88rem;
		color: rgba(255, 255, 255, 0.92);
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.save-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.24);
		color: #fff;
	}

	.json-output {
		margin: 1rem 0 0;
		padding: 1.25rem 1.5rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		flex: 1 1 0;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.85rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.92);
		font-weight: 400;
		scrollbar-color: rgba(255, 255, 255, 0.5) transparent;
	}

	.json-output::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.5);
		background-clip: padding-box;
	}

	.json-output::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.7);
		background-clip: padding-box;
	}

	.json-output::-webkit-scrollbar-thumb:active {
		background: rgba(255, 255, 255, 0.85);
		background-clip: padding-box;
	}

	.json-line {
		padding-left: calc(var(--indent, 0) * 1ch);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-height: 1.55em;
	}

	.empty {
		margin-top: 1.75rem;
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
</style>
