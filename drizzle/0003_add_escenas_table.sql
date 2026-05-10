CREATE TABLE `escenas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proyecto_id` integer NOT NULL,
	`numero` integer NOT NULL,
	`encabezado` text NOT NULL,
	`descripcion` text NOT NULL,
	`personajes` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
