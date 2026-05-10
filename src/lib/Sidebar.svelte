<script lang="ts">
  import { page } from '$app/state';
  import {
    Clapperboard,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown
  } from '@lucide/svelte';

  type Orientation = 'vertical' | 'horizontal';

  let {
    orientation = 'vertical',
    collapsed = false,
    toggleOrientation,
    toggleCollapsed
  }: {
    orientation?: Orientation;
    collapsed?: boolean;
    toggleOrientation: () => void;
    toggleCollapsed: () => void;
  } = $props();

  const isActive = (href: string) =>
    page.url.pathname === href || page.url.pathname.startsWith(href + '/');

  let tiltX = $state(0);
  let tiltY = $state(0);

  function handleMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const MAX = 2.5;
    tiltX = -ny * MAX;
    tiltY = nx * MAX;
  }

  function handleLeave() {
    tiltX = 0;
    tiltY = 0;
  }

  function handleDblClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('a, button')) return;
    tiltX = 0;
    tiltY = 0;
    toggleOrientation();
  }

  function handleCollapseClick(e: MouseEvent) {
    e.stopPropagation();
    tiltX = 0;
    tiltY = 0;
    toggleCollapsed();
  }
</script>

{#if !collapsed}
  <aside
    class="sidebar {orientation}"
    style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
    onmousemove={handleMove}
    onmouseleave={handleLeave}
    ondblclick={handleDblClick}
  >
    <header class="brand">
      <Clapperboard size={26} strokeWidth={2} />
      <span class="brand-title">Estudio</span>
    </header>

    <nav>
      <a
        href="/proyectos"
        class="nav-item"
        aria-current={isActive('/proyectos') ? 'page' : undefined}
      >
        Proyectos
      </a>
    </nav>

    <div class="sidebar-footer">
      <button
        type="button"
        class="collapse-btn"
        onclick={handleCollapseClick}
        aria-label="Replegar barra"
      >
        {#if orientation === 'vertical'}
          <ChevronLeft size={18} strokeWidth={2.2} />
        {:else}
          <ChevronUp size={18} strokeWidth={2.2} />
        {/if}
      </button>
    </div>
  </aside>
{:else}
  <button
    type="button"
    class="reveal-handle {orientation}"
    onclick={toggleCollapsed}
    aria-label="Mostrar barra"
  >
    {#if orientation === 'vertical'}
      <ChevronRight size={18} strokeWidth={2.2} />
    {:else}
      <ChevronDown size={18} strokeWidth={2.2} />
    {/if}
  </button>
{/if}

<style>
  .sidebar {
    position: fixed;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid #fff;
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.18);
    transition: transform 0.18s ease-out;
    will-change: transform;
    user-select: none;
    view-transition-name: nav-bar;
  }

  .sidebar.vertical {
    top: 1rem;
    left: 1rem;
    bottom: 1rem;
    width: 240px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
  }

  .sidebar.horizontal {
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: 56px;
    padding: 0 1.25rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: rgba(255, 255, 255, 0.98);
  }

  .sidebar.vertical .brand {
    padding: 0.25rem 0.45rem 1rem;
    margin-bottom: 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .sidebar.horizontal .brand {
    padding-right: 1.25rem;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    height: 60%;
  }

  .brand-title {
    font-size: 1.2rem;
    letter-spacing: 0.005em;
  }

  nav {
    display: flex;
    gap: 0.4rem;
  }

  .sidebar.vertical nav {
    flex-direction: column;
  }

  .sidebar.horizontal nav {
    flex-direction: row;
    align-items: center;
    flex: 1;
  }

  .nav-item {
    display: block;
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .sidebar.vertical .nav-item {
    padding: 0.7rem 0.95rem;
  }

  .sidebar.horizontal .nav-item {
    padding: 0.4rem 0.95rem;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.16);
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar.vertical .sidebar-footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .sidebar.horizontal .sidebar-footer {
    margin-left: auto;
    height: 60%;
    padding-left: 1.25rem;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }

  .collapse-btn,
  .reveal-handle {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }

  .collapse-btn:hover,
  .reveal-handle:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.24);
    color: #fff;
  }

  .reveal-handle {
    position: fixed;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.18);
    padding: 0.55rem 0.45rem;
    z-index: 10;
    view-transition-name: nav-bar;
  }

  .reveal-handle.vertical {
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .reveal-handle.horizontal {
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
  }
</style>
