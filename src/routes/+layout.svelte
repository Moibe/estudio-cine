<script lang="ts">
	import '@fontsource/roboto/700.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/Sidebar.svelte';

	let { children } = $props();
	let orientation = $state<'vertical' | 'horizontal'>('vertical');
	let collapsed = $state(false);

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

<Sidebar {orientation} {collapsed} {toggleOrientation} {toggleCollapsed} />
<main class="{orientation}{collapsed ? ' collapsed' : ''}">
	{@render children()}
</main>

<style>
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

	main {
		min-height: 100vh;
	}

	main.vertical {
		margin-left: calc(240px + 2rem);
		margin-top: 0;
	}

	main.vertical.collapsed {
		margin-left: 2rem;
	}

	main.horizontal {
		margin-left: 0;
		margin-top: calc(56px + 2rem);
	}

	main.horizontal.collapsed {
		margin-top: 2rem;
	}

	:global(::view-transition-group(nav-bar)) {
		animation-duration: 0.32s;
		animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
