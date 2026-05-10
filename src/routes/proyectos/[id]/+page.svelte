<script lang="ts">
	import { enhance } from '$app/forms';
	import { FileText, Download, Upload, CheckCircle2, Eye, Zap, Braces } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let uploading = $state(false);
	let selectedName = $state('');
	let showSuccess = $state(false);
	let successTimeout: ReturnType<typeof setTimeout> | undefined;
	let showUploadForm = $state(false);

	function handleFileChange() {
		selectedName = fileInput?.files?.[0]?.name ?? '';
	}

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
	<header class="header">
		<h1>{data.proyecto.titulo}</h1>
		<p class="meta">Creado el {formatDate(data.proyecto.createdAt)}</p>
	</header>

	<section class="block">
		<h2>Script</h2>

		{#if data.script}
			<div class="script-card">
				<div class="script-icon"><FileText size={22} strokeWidth={1.8} /></div>
				<div class="script-info">
					<strong class="script-name">{data.script.originalName}</strong>
					<span class="script-meta">
						{formatBytes(data.script.size)} · subido el {formatDate(data.script.uploadedAt)}
					</span>
				</div>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script/view`}
					aria-label="Visualizar script"
				>
					<Eye size={16} strokeWidth={2.2} />
				</a>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script/json`}
					aria-label="Ver JSON estructurado"
				>
					<Braces size={16} strokeWidth={2.2} />
				</a>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script/build`}
					aria-label="Construir JSON con IA"
				>
					<Zap size={16} strokeWidth={2.2} />
				</a>
				<a
					class="action-btn"
					href={`/proyectos/${data.proyecto.id}/script`}
					aria-label="Descargar script"
					download
				>
					<Download size={16} strokeWidth={2.2} />
				</a>
				<button
					type="button"
					class="action-btn"
					class:active={showUploadForm}
					onclick={() => (showUploadForm = !showUploadForm)}
					aria-label="Reemplazar script"
				>
					<Upload size={16} strokeWidth={2.2} />
				</button>
			</div>
		{/if}

		{#if !data.script || showUploadForm}
		<form
			method="POST"
			action="?/uploadScript"
			enctype="multipart/form-data"
			class="upload-form"
			use:enhance={() => {
				uploading = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					uploading = false;
					if (result.type === 'success') {
						selectedName = '';
						if (fileInput) fileInput.value = '';
						showSuccess = true;
						showUploadForm = false;
						clearTimeout(successTimeout);
						successTimeout = setTimeout(() => (showSuccess = false), 3500);
					}
				};
			}}
		>
			<label class="file-picker">
				<input
					bind:this={fileInput}
					type="file"
					name="file"
					accept=".docx,.doc"
					required
					onchange={handleFileChange}
					disabled={uploading}
				/>
				<span class="file-picker-label">
					{selectedName || (data.script ? 'Reemplazar archivo .docx' : 'Selecciona un .docx')}
				</span>
			</label>

			<button
				type="submit"
				class="upload-btn"
				disabled={uploading}
				onclick={(e) => {
					if (!selectedName) {
						e.preventDefault();
						fileInput?.click();
					}
				}}
			>
				<Upload size={16} strokeWidth={2.2} />
				<span>{uploading ? 'Subiendo…' : data.script ? 'Reemplazar Script' : 'Cargar Script'}</span>
			</button>
		</form>
		{/if}

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		{#if showSuccess}
			<p class="success">
				<CheckCircle2 size={16} strokeWidth={2.4} />
				<span>Script subido correctamente</span>
			</p>
		{/if}
	</section>
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		max-width: 920px;
	}

	.header {
		margin-top: 0;
	}

	h1 {
		margin: 0 0 0.4rem;
		font-size: 2rem;
		letter-spacing: -0.01em;
	}

	.meta {
		margin: 0;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}

	.block {
		margin-top: 2rem;
	}

	h2 {
		margin: 0 0 1rem;
		font-size: 1.15rem;
		color: rgba(255, 255, 255, 0.85);
		letter-spacing: 0.01em;
	}

	.script-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.15rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		margin-bottom: 1rem;
	}

	.script-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		border-radius: 10px;
		background: rgba(37, 99, 235, 0.18);
		color: #93c5fd;
		flex-shrink: 0;
	}

	.script-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		flex: 1;
	}

	.script-name {
		font-size: 0.98rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.script-meta {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
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

	.action-btn.active {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.32);
	}

	button.action-btn {
		font: inherit;
		cursor: pointer;
	}

	.upload-form {
		display: flex;
		gap: 0.6rem;
		align-items: stretch;
		flex-wrap: wrap;
	}

	.file-picker {
		flex: 1 1 280px;
		display: inline-flex;
		align-items: center;
		padding: 0.65rem 0.95rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px dashed rgba(255, 255, 255, 0.22);
		border-radius: 10px;
		cursor: pointer;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.file-picker:hover {
		border-color: rgba(255, 255, 255, 0.4);
		background: rgba(255, 255, 255, 0.07);
	}

	.file-picker input[type='file'] {
		display: none;
	}

	.file-picker-label {
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.92rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.1rem;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		font: inherit;
		cursor: pointer;
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease,
			opacity 0.18s ease;
	}

	.upload-btn:hover:not(:disabled) {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
	}

	.upload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	.error {
		margin: 0.8rem 0 0;
		color: #fecaca;
		font-size: 0.9rem;
	}

	.success {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.8rem 0 0;
		padding: 0.5rem 0.85rem;
		color: #86efac;
		background: rgba(22, 163, 74, 0.15);
		border: 1px solid rgba(22, 163, 74, 0.32);
		border-radius: 8px;
		font-size: 0.9rem;
	}
</style>
