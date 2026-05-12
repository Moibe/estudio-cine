<script lang="ts">
  import { page } from '$app/state';
  import { Clapperboard } from '@lucide/svelte';

  const isActive = (href: string) =>
    page.url.pathname === href || page.url.pathname.startsWith(href + '/');

  let tiltX = $state(0);
  let tiltY = $state(0);

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
</script>

<header
  class="topnav"
  style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
  onmousemove={handleMove}
  onmouseleave={handleLeave}
>
  <a href="/" class="brand" aria-label="Inicio">
    <Clapperboard size={26} strokeWidth={2} />
    <span class="brand-title">Estudio</span>
  </a>

  <nav>
    <a
      href="/proyectos"
      class="nav-item"
      aria-current={isActive('/proyectos') ? 'page' : undefined}
    >
      Proyectos
    </a>
  </nav>
</header>

<style>
  .topnav {
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: var(--topnav-height, 64px);
    padding: 0 1.25rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
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
    z-index: 9;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: rgba(255, 255, 255, 0.98);
    text-decoration: none;
    border-radius: 8px;
    padding: 0.25rem 0.4rem;
    transition: background 0.18s ease;
  }

  .brand:hover {
    background: rgba(255, 255, 255, 0.05);
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
    align-items: center;
    gap: 0.4rem;
    margin-left: 1.25rem;
    padding-left: 1.25rem;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    height: 60%;
  }

  .nav-item {
    display: inline-flex;
    align-items: center;
    padding: 0.45rem 0.95rem;
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    text-shadow:
      0 0 8px rgba(255, 255, 255, 0.22),
      0 0 18px rgba(255, 255, 255, 0.10);
    transition: background 0.18s ease, border-color 0.18s ease;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.16);
  }
</style>
