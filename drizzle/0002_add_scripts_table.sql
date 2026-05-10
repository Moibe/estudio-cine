CREATE TABLE `scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proyecto_id` integer NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scripts_proyecto_id_unique` ON `scripts` (`proyecto_id`);