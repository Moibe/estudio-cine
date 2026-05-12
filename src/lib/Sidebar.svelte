<script lang="ts">
  import { page } from '$app/state';
  import { slide } from 'svelte/transition';
  import {
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Users,
    Map,
    BookOpen,
    Boxes
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

  type SidebarEscena = {
    id: number;
    numero: number;
    titulo: string;
    encabezado: string;
    actoNumero: number;
    actoTitulo: string;
  };
  type SidebarActo = { numero: number; titulo: string; escenas: SidebarEscena[] };
  type SidebarProyecto = { id: number; titulo: string };

  const isActive = (href: string) =>
    page.url.pathname === href || page.url.pathname.startsWith(href + '/');

  const proyectoCtx = $derived(
    (page.data as { proyecto?: { id: number; titulo: string } }).proyecto
  );
  const escenasInCtx = $derived(
    ((page.data as { escenas?: SidebarEscena[] }).escenas ?? []) as SidebarEscena[]
  );
  const proyectosList = $derived(
    ((page.data as { proyectos?: SidebarProyecto[] }).proyectos ?? []) as SidebarProyecto[]
  );
  const onProyectosIndex = $derived(
    page.url.pathname === '/proyectos' || page.url.pathname === '/proyectos/'
  );

  const actosInCtx: SidebarActo[] = $derived.by(() => {
    const groups = new Map<number, SidebarActo>();
    for (const e of escenasInCtx) {
      let g = groups.get(e.actoNumero);
      if (!g) {
        g = { numero: e.actoNumero, titulo: e.actoTitulo, escenas: [] };
        groups.set(e.actoNumero, g);
      }
      g.escenas.push(e);
    }
    return Array.from(groups.values()).sort((a, b) => a.numero - b.numero);
  });

  let tiltX = $state(0);
  let tiltY = $state(0);
  let sidebarWidth = $state(240);

  $effect(() => {
    if (typeof document !== 'undefined' && orientation === 'vertical' && !collapsed) {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }
  });

  function handleMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const MAX = 1.2;
    tiltX = -ny * MAX;
    tiltY = nx * MAX;
  }

  function handleLeave() {
    tiltX = 0;
    tiltY = 0;
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
    bind:clientWidth={sidebarWidth}
    onmousemove={handleMove}
    onmouseleave={handleLeave}
  >
    {#if proyectoCtx}
      <header class="active-project">
        <span class="section-label">Proyecto</span>
        <h2 class="active-project-title">
          <a href="/proyectos/{proyectoCtx.id}">{proyectoCtx.titulo}</a>
        </h2>
      </header>
    {/if}

    <nav>
      {#if proyectoCtx}
        <a
          href="/proyectos/{proyectoCtx.id}/historia"
          class="nav-item"
          aria-current={isActive(`/proyectos/${proyectoCtx.id}/historia`) ? 'page' : undefined}
        >
          <BookOpen size={16} strokeWidth={2.2} />
          <span>Historia</span>
        </a>
        <a
          href="/proyectos/{proyectoCtx.id}/personajes"
          class="nav-item"
          aria-current={isActive(`/proyectos/${proyectoCtx.id}/personajes`) ? 'page' : undefined}
        >
          <Users size={16} strokeWidth={2.2} />
          <span>Personajes</span>
        </a>
        <a
          href="/proyectos/{proyectoCtx.id}/escenarios"
          class="nav-item"
          aria-current={isActive(`/proyectos/${proyectoCtx.id}/escenarios`) ? 'page' : undefined}
        >
          <Map size={16} strokeWidth={2.2} />
          <span>Escenarios</span>
        </a>
        <a
          href="/proyectos/{proyectoCtx.id}/elementos"
          class="nav-item"
          aria-current={isActive(`/proyectos/${proyectoCtx.id}/elementos`) ? 'page' : undefined}
        >
          <Boxes size={16} strokeWidth={2.2} />
          <span>Elementos</span>
        </a>
      {:else if onProyectosIndex && proyectosList.length > 0}
        <div class="section">
          <span class="section-label">Proyectos</span>
          <div class="section-list">
            {#each proyectosList as p (p.id)}
              <a
                href="/proyectos/{p.id}"
                class="nav-item nav-sub"
                aria-current={isActive(`/proyectos/${p.id}`) ? 'page' : undefined}
              >
                <span class="text">{p.titulo}</span>
              </a>
            {/each}
          </div>
        </div>
      {/if}
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
      0 4px 16px rgba(0, 0, 0, 0.12);
    transition: transform 0.18s ease-out;
    will-change: transform;
    user-select: none;
  }

  .sidebar.vertical {
    top: calc(2rem + var(--topnav-height, 64px));
    left: 1rem;
    bottom: 1rem;
    width: max-content;
    min-width: 240px;
    max-width: 380px;
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
    text-shadow:
      0 0 10px rgba(255, 255, 255, 0.28),
      0 0 24px rgba(255, 255, 255, 0.14);
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
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    text-shadow:
      0 0 8px rgba(255, 255, 255, 0.22),
      0 0 18px rgba(255, 255, 255, 0.10);
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

  .active-project {
    padding: 0 0.95rem 1rem;
    margin-bottom: 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .active-project .section-label {
    padding: 0 0 0.15rem;
  }

  .active-project-title {
    margin: 0.25rem 0 0;
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.98);
    letter-spacing: 0.005em;
    text-shadow:
      0 0 10px rgba(255, 255, 255, 0.28),
      0 0 24px rgba(255, 255, 255, 0.14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-project-title a {
    color: inherit;
    text-decoration: none;
    transition: color 0.18s ease, text-shadow 0.18s ease;
  }

  .active-project-title a:hover {
    color: #fff;
    text-shadow:
      0 0 12px rgba(147, 197, 253, 0.55),
      0 0 28px rgba(37, 99, 235, 0.32);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .section-secondary {
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .section-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.45);
    padding: 0 0.95rem 0.15rem;
  }

  .section-list {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    overflow-y: auto;
    max-height: 100%;
  }

  .nav-sub {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    padding: 0.5rem 0.95rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.78);
    min-width: 0;
  }

  .nav-sub .num {
    color: rgba(255, 255, 255, 0.45);
    font-size: 0.78rem;
    flex-shrink: 0;
  }

  .nav-sub .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar.horizontal .section {
    display: none;
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
      0 4px 16px rgba(0, 0, 0, 0.12);
    padding: 0.55rem 0.45rem;
    z-index: 10;
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
