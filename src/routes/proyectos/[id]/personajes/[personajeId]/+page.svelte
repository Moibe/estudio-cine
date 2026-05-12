<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		Check,
		ImagePlus,
		Loader2,
		Pencil,
		Sparkles,
		Trash2,
		Upload,
		User,
		X
	} from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const escenasDelPersonaje = $derived.by(() => {
		const id = data.personaje.id;
		return data.escenas
			.filter((e) => e.personajes.some((p) => p.id === id))
			.map((e) => ({ id: e.id, numero: e.numero, titulo: e.titulo, encabezado: e.encabezado }))
			.sort((a, b) => a.numero - b.numero);
	});

	let editing = $state(false);
	let editingDescripcion = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let enhancing = $state(false);

	let fotoInput: HTMLInputElement | undefined = $state();
	let selectedFotoName = $state('');
	let uploadingFoto = $state(false);
	let deletingFoto = $state(false);

	function handleFotoChange() {
		selectedFotoName = fotoInput?.files?.[0]?.name ?? '';
	}

	$effect(() => {
		if (editing && textareaEl) textareaEl.focus();
	});

	function startEdit() {
		editingDescripcion = data.personaje.descripcion;
		editing = true;
	}

	function cancelEdit() {
		editing = false;
		editingDescripcion = '';
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelEdit();
	}
</script>

<section class="page">
	<a href="/proyectos/{data.proyecto.id}/personajes" class="back">
		<ArrowLeft size={16} strokeWidth={2.2} />
		<span>Personajes</span>
	</a>

	<header class="header">
		<User size={20} strokeWidth={2} class="header-icon" />
		<h1>{data.personaje.nombre}</h1>
		<span class="apariciones">
			{escenasDelPersonaje.length}
			{escenasDelPersonaje.length === 1 ? 'escena' : 'escenas'}
		</span>
	</header>

	<section class="block">
		<div class="block-header">
			<h2>Descripción</h2>
			{#if !editing}
				<button
					type="button"
					class="edit-btn"
					onclick={startEdit}
					aria-label="Editar descripción"
				>
					<Pencil size={14} strokeWidth={2.2} />
				</button>
				{#if data.personaje.descripcion.trim()}
					<form
						method="POST"
						action="?/enhanceDescripcion"
						class="enhance-form"
						use:enhance={() => {
							enhancing = true;
							return async ({ update }) => {
								await update({ reset: false });
								enhancing = false;
							};
						}}
					>
						<button
							type="submit"
							class="enhance-btn"
							disabled={enhancing}
							aria-label="Mejorar descripción con IA"
						>
							{#if enhancing}
								<Loader2 size={13} strokeWidth={2.4} class="spin" />
								<span>Mejorando…</span>
							{:else}
								<Sparkles size={13} strokeWidth={2.4} />
								<span>Mejorar</span>
							{/if}
						</button>
					</form>
				{/if}
			{/if}
		</div>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		{#if editing}
			<form
				method="POST"
				action="?/updateDescripcion"
				class="edit-form"
				use:enhance={() =>
					async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') cancelEdit();
					}}
			>
				<textarea
					bind:this={textareaEl}
					name="descripcion"
					class="edit-textarea"
					bind:value={editingDescripcion}
					onkeydown={handleEditKeydown}
					rows="6"
				></textarea>
				<div class="edit-actions">
					<button type="submit" class="icon-btn save" aria-label="Guardar">
						<Check size={16} strokeWidth={2.4} />
					</button>
					<button
						type="button"
						class="icon-btn"
						onclick={cancelEdit}
						aria-label="Cancelar"
					>
						<X size={16} strokeWidth={2.4} />
					</button>
				</div>
			</form>
		{:else if data.personaje.descripcion}
			<p class="descripcion">{data.personaje.descripcion}</p>
		{:else}
			<p class="descripcion-vacia">
				El script no incluye una descripción de este personaje.
			</p>
		{/if}
	</section>

	<section class="block">
		<div class="block-header">
			<h2>Foto</h2>
			{#if data.personaje.foto}
				<form
					method="POST"
					action="?/deleteFoto"
					class="enhance-form"
					use:enhance={() => {
						deletingFoto = true;
						return async ({ update }) => {
							await update({ reset: false });
							deletingFoto = false;
						};
					}}
				>
					<button
						type="submit"
						class="delete-foto-btn"
						disabled={deletingFoto || uploadingFoto}
						aria-label="Eliminar foto"
					>
						{#if deletingFoto}
							<Loader2 size={13} strokeWidth={2.4} class="spin" />
						{:else}
							<Trash2 size={13} strokeWidth={2.4} />
						{/if}
					</button>
				</form>
			{/if}
		</div>

		{#if data.personaje.foto}
			<div class="foto-card">
				<img class="foto-img" src={data.personaje.foto} alt={data.personaje.nombre} />
			</div>
		{/if}

		<form
			method="POST"
			action="?/uploadFoto"
			enctype="multipart/form-data"
			class="foto-upload-form"
			use:enhance={() => {
				uploadingFoto = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					uploadingFoto = false;
					if (result.type === 'success') {
						selectedFotoName = '';
						if (fotoInput) fotoInput.value = '';
					}
				};
			}}
		>
			<label class="file-picker">
				<input
					bind:this={fotoInput}
					type="file"
					name="foto"
					accept="image/jpeg,image/png,image/webp,image/gif"
					required
					onchange={handleFotoChange}
					disabled={uploadingFoto}
				/>
				<ImagePlus size={16} strokeWidth={2.2} />
				<span class="file-picker-label">
					{selectedFotoName ||
						(data.personaje.foto ? 'Reemplazar imagen' : 'Selecciona una imagen')}
				</span>
			</label>

			<button
				type="submit"
				class="foto-upload-btn"
				disabled={uploadingFoto || !selectedFotoName}
			>
				{#if uploadingFoto}
					<Loader2 size={15} strokeWidth={2.4} class="spin" />
					<span>Subiendo…</span>
				{:else}
					<Upload size={15} strokeWidth={2.4} />
					<span>{data.personaje.foto ? 'Reemplazar' : 'Subir'}</span>
				{/if}
			</button>
		</form>
	</section>

	{#if escenasDelPersonaje.length > 0}
		<section class="block">
			<h2 class="solo">Aparece en</h2>
			<ul class="escenas">
				{#each escenasDelPersonaje as e (e.id)}
					<a
						class="escena-pill"
						href={`/proyectos/${data.proyecto.id}/escenas/${e.id}`}
					>
						<span class="num">{e.numero}</span>
						<span class="title">{e.titulo || e.encabezado}</span>
					</a>
				{/each}
			</ul>
		</section>
	{/if}
</section>

<style>
	.page {
		padding: 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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
		color: #93c5fd;
		flex-shrink: 0;
	}

	h1 {
		margin: 0;
		font-size: 1.7rem;
		letter-spacing: -0.005em;
		color: #93c5fd;
	}

	.apariciones {
		margin-left: 0.5rem;
		font-size: 0.85rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.5);
	}

	.block-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.85rem;
	}

	.block-header h2,
	.block h2.solo {
		margin: 0;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.45);
		font-weight: 700;
	}

	.block h2.solo {
		margin: 0 0 0.85rem;
	}

	.edit-btn {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 0.3rem;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font: inherit;
		transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
	}

	.edit-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.95);
		border-color: rgba(255, 255, 255, 0.14);
	}

	.enhance-form {
		display: inline-flex;
		margin: 0;
	}

	.enhance-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.6rem;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #c4b5fd;
		background: rgba(139, 92, 246, 0.14);
		border: 1px solid rgba(139, 92, 246, 0.36);
		border-radius: 999px;
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
			box-shadow 0.18s ease, opacity 0.18s ease;
	}

	.enhance-btn:hover:not(:disabled) {
		color: #ddd6fe;
		background: rgba(139, 92, 246, 0.26);
		border-color: rgba(139, 92, 246, 0.58);
		box-shadow: 0 3px 12px rgba(139, 92, 246, 0.28);
	}

	.enhance-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.enhance-btn :global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes -global-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		margin: 0 0 0.85rem;
		padding: 0.55rem 0.85rem;
		color: #fecaca;
		background: rgba(220, 38, 38, 0.12);
		border: 1px solid rgba(220, 38, 38, 0.32);
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 400;
	}

	.delete-foto-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.45);
		cursor: pointer;
		font: inherit;
		transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
	}

	.delete-foto-btn:hover:not(:disabled) {
		background: rgba(220, 38, 38, 0.16);
		color: #fca5a5;
		border-color: rgba(220, 38, 38, 0.4);
	}

	.delete-foto-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.delete-foto-btn :global(.spin) {
		animation: spin 1s linear infinite;
	}

	.foto-card {
		margin-bottom: 0.85rem;
		max-width: 360px;
	}

	.foto-img {
		display: block;
		width: 100%;
		max-height: 360px;
		object-fit: cover;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.foto-upload-form {
		display: flex;
		gap: 0.6rem;
		align-items: stretch;
		flex-wrap: wrap;
	}

	.file-picker {
		flex: 1 1 240px;
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.65rem 0.95rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px dashed rgba(255, 255, 255, 0.22);
		border-radius: 10px;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.85);
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
		font-size: 0.88rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.foto-upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.65rem 1.1rem;
		font: inherit;
		font-size: 0.88rem;
		color: #fff;
		background: #2563EB;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		cursor: pointer;
		box-shadow: 0 4px 18px rgba(37, 99, 235, 0.32);
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease,
			opacity 0.18s ease;
	}

	.foto-upload-btn:hover:not(:disabled) {
		background: #1D4ED8;
		border-color: rgba(255, 255, 255, 0.24);
		box-shadow: 0 5px 22px rgba(37, 99, 235, 0.42);
	}

	.foto-upload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	.foto-upload-btn :global(.spin) {
		animation: spin 1s linear infinite;
	}

	.edit-form {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
	}

	.edit-textarea {
		flex: 1;
		min-height: 7rem;
		padding: 0.85rem 1.05rem;
		font: inherit;
		font-weight: 400;
		font-size: 0.95rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 12px;
		outline: none;
		resize: vertical;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.edit-textarea:focus {
		border-color: rgba(255, 255, 255, 0.32);
		background: rgba(255, 255, 255, 0.08);
	}

	.edit-actions {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.icon-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		padding: 0.4rem;
		color: rgba(255, 255, 255, 0.85);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font: inherit;
		transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.22);
	}

	.icon-btn.save {
		background: #2563EB;
		color: #fff;
		border-color: rgba(255, 255, 255, 0.2);
		box-shadow: 0 3px 12px rgba(37, 99, 235, 0.32);
	}

	.icon-btn.save:hover {
		background: #1D4ED8;
		box-shadow: 0 5px 16px rgba(37, 99, 235, 0.42);
	}

	.descripcion {
		margin: 0;
		padding: 1rem 1.2rem;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(10px) saturate(115%);
		-webkit-backdrop-filter: blur(10px) saturate(115%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.92);
		font-weight: 400;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.descripcion-vacia {
		margin: 0;
		padding: 1rem 1.2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.14);
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 400;
		font-style: italic;
		line-height: 1.55;
	}

	.escenas {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.escena-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.85rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.82rem;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}

	.escena-pill:hover {
		background: rgba(37, 99, 235, 0.18);
		border-color: rgba(37, 99, 235, 0.42);
		color: #fff;
	}

	.escena-pill .num {
		font-weight: 700;
		color: rgba(255, 255, 255, 0.55);
	}

	.escena-pill:hover .num {
		color: #93c5fd;
	}

	.escena-pill .title {
		font-weight: 400;
	}
</style>
