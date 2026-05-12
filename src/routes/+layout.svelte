<script lang="ts">
	import '@fontsource/roboto/700.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/Sidebar.svelte';
	import TopNav from '$lib/TopNav.svelte';

	let { children } = $props();
	let orientation = $state<'vertical' | 'horizontal'>('vertical');
	let collapsed = $state(false);

	// La barra lateral solo es útil cuando estamos DENTRO de un proyecto (muestra Historia,
	// Personajes, etc.). En el root, en el índice de proyectos, o en cualquier otra ruta
	// sin contexto de proyecto, se retrae. Al entrar a un proyecto se expande automáticamente.
	// Dentro de un proyecto se respeta el toggle manual entre páginas hermanas porque el
	// $derived memoiza y el $effect no re-dispara mientras `isInProject` no cambie.
	const isInProject = $derived(
		(page.data as { proyecto?: { id: number } }).proyecto != null
	);

	$effect(() => {
		collapsed = !isInProject;
	});

	function withTransition(fn: () => void) {
		if (typeof document !== 'undefined' && 'startViewTransition' in document) {
			(document as any).startViewTransition(fn);
		} else {
			fn();
		}
	}

	function toggleOrientation() {
		withTransition(() => {
			orientation = orientation === 'vertical' ? 'horizontal' : 'vertical';
		});
	}

	function toggleCollapsed() {
		withTransition(() => {
			collapsed = !collapsed;
		});
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<TopNav />
<Sidebar {orientation} {collapsed} {toggleOrientation} {toggleCollapsed} />
<main class="{orientation}{collapsed ? ' collapsed' : ''}">
	<div class="work-scroll">
		{@render children()}
	</div>
</main>

<style>
	:global(:root) {
		--topnav-height: 64px;
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
	}
	:global(body) {
		min-height: 100vh;
		background: linear-gradient(135deg, #0A1929 0%, #2563EB 100%);
		background-attachment: fixed;
		color: rgba(255, 255, 255, 0.95);
		font-family: 'Roboto', sans-serif;
		font-weight: 700;
	}

	/* Firefox */
	:global(*) {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.45) transparent;
	}

	/* WebKit / Blink (Chrome, Edge, Safari) */
	:global(::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}
	:global(::-webkit-scrollbar-track) {
		background: transparent;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.45);
		border-radius: 999px;
		border: 2px solid transparent;
		background-clip: padding-box;
		transition: background-color 0.18s ease;
	}
	:global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.65);
		background-clip: padding-box;
	}
	:global(::-webkit-scrollbar-thumb:active) {
		background: rgba(255, 255, 255, 0.85);
		background-clip: padding-box;
	}
	:global(::-webkit-scrollbar-corner) {
		background: transparent;
	}

	main {
		position: fixed;
		top: calc(2rem + var(--topnav-height));
		right: 1rem;
		bottom: 1rem;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.012);
		backdrop-filter: blur(8px) saturate(110%);
		-webkit-backdrop-filter: blur(8px) saturate(110%);
		border: 1px solid #fff;
		border-radius: 16px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.12);
		overflow: hidden;
		transition: left 0.22s ease-out;
	}

	.work-scroll {
		position: absolute;
		top: 16px;
		bottom: 16px;
		left: 0;
		right: 0;
		overflow-y: auto;
		overflow-x: hidden;
	}

	main.vertical {
		left: calc(var(--sidebar-width, 240px) + 2rem);
	}

	main.vertical.collapsed {
		left: 2rem;
	}

	main.horizontal {
		left: 1rem;
	}

	main.horizontal.collapsed {
		left: 1rem;
	}
</style>
