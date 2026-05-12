CREATE TABLE `tomas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`escena_id` integer NOT NULL,
	`numero` integer NOT NULL,
	`tipo` text NOT NULL,
	`encuadre` text NOT NULL,
	`descripcion` text DEFAULT '' NOT NULL,
	`movimiento_camara` text DEFAULT '' NOT NULL,
	`duracion_segundos` integer,
	`source` text DEFAULT 'ai' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`escena_id`) REFERENCES `escenas`(`id`) ON UPDATE no action ON DELETE cascade
);
