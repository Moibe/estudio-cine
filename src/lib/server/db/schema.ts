import { sqliteTable, integer, text, primaryKey, unique } from 'drizzle-orm/sqlite-core';

export const proyectos = sqliteTable('proyectos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	titulo: text('titulo').notNull(),
	position: integer('position').notNull().default(0),
	duracionEstimadaSegundos: integer('duracion_estimada_segundos'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Proyecto = typeof proyectos.$inferSelect;
export type NuevoProyecto = typeof proyectos.$inferInsert;

export const scripts = sqliteTable('scripts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	proyectoId: integer('proyecto_id')
		.notNull()
		.unique()
		.references(() => proyectos.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	originalName: text('original_name').notNull(),
	size: integer('size').notNull(),
	uploadedAt: integer('uploaded_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Script = typeof scripts.$inferSelect;

export const actos = sqliteTable('actos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	proyectoId: integer('proyecto_id')
		.notNull()
		.references(() => proyectos.id, { onDelete: 'cascade' }),
	numero: integer('numero').notNull(),
	titulo: text('titulo').notNull().default(''),
	duracionSegundos: integer('duracion_segundos'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Acto = typeof actos.$inferSelect;

export const escenarios = sqliteTable(
	'escenarios',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		proyectoId: integer('proyecto_id')
			.notNull()
			.references(() => proyectos.id, { onDelete: 'cascade' }),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion').notNull().default(''),
		foto: text('foto'),
		source: text('source', { enum: ['ai', 'manual'] }).notNull().default('ai'),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [unique().on(t.proyectoId, t.nombre)]
);

export type Escenario = typeof escenarios.$inferSelect;

export const personajes = sqliteTable(
	'personajes',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		proyectoId: integer('proyecto_id')
			.notNull()
			.references(() => proyectos.id, { onDelete: 'cascade' }),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion').notNull().default(''),
		foto: text('foto'),
		source: text('source', { enum: ['ai', 'manual'] }).notNull().default('ai'),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [unique().on(t.proyectoId, t.nombre)]
);

export type Personaje = typeof personajes.$inferSelect;

export const elementos = sqliteTable(
	'elementos',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		proyectoId: integer('proyecto_id')
			.notNull()
			.references(() => proyectos.id, { onDelete: 'cascade' }),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion').notNull().default(''),
		source: text('source', { enum: ['ai', 'manual'] }).notNull().default('ai'),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [unique().on(t.proyectoId, t.nombre)]
);

export type Elemento = typeof elementos.$inferSelect;

export const escenas = sqliteTable('escenas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	proyectoId: integer('proyecto_id')
		.notNull()
		.references(() => proyectos.id, { onDelete: 'cascade' }),
	actoId: integer('acto_id').references(() => actos.id, { onDelete: 'cascade' }),
	escenarioId: integer('escenario_id').references(() => escenarios.id, {
		onDelete: 'restrict'
	}),
	numero: integer('numero').notNull(),
	titulo: text('titulo').notNull().default(''),
	encabezado: text('encabezado').notNull(),
	descripcion: text('descripcion').notNull(),
	texto: text('texto').notNull().default(''),
	personajes: text('personajes', { mode: 'json' }).$type<string[]>().notNull(),
	actoNumero: integer('acto_numero').notNull().default(1),
	actoTitulo: text('acto_titulo').notNull().default(''),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Escena = typeof escenas.$inferSelect;

export const participaciones = sqliteTable(
	'participaciones',
	{
		escenaId: integer('escena_id')
			.notNull()
			.references(() => escenas.id, { onDelete: 'cascade' }),
		personajeId: integer('personaje_id')
			.notNull()
			.references(() => personajes.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.escenaId, t.personajeId] })]
);

export type Participacion = typeof participaciones.$inferSelect;

export const tomas = sqliteTable('tomas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	escenaId: integer('escena_id')
		.notNull()
		.references(() => escenas.id, { onDelete: 'cascade' }),
	numero: integer('numero').notNull(),
	tipoToma: text('tipo_toma').notNull(),
	composicion: text('composicion').notNull().default(''),
	encuadre: text('encuadre').notNull(),
	descripcion: text('descripcion').notNull().default(''),
	movimientoCamara: text('movimiento_camara').notNull().default(''),
	duracionSegundos: integer('duracion_segundos'),
	source: text('source', { enum: ['ai', 'manual'] }).notNull().default('ai'),
	position: integer('position').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Toma = typeof tomas.$inferSelect;

export const scriptBuilds = sqliteTable('script_builds', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	proyectoId: integer('proyecto_id')
		.notNull()
		.references(() => proyectos.id, { onDelete: 'cascade' }),
	model: text('model').notNull(),
	json: text('json').notNull(),
	restoredFromId: integer('restored_from_id'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type ScriptBuild = typeof scriptBuilds.$inferSelect;
