import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const proyectos = sqliteTable('proyectos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	titulo: text('titulo').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Proyecto = typeof proyectos.$inferSelect;
export type NuevoProyecto = typeof proyectos.$inferInsert;
