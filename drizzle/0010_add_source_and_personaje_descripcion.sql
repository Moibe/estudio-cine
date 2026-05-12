ALTER TABLE `elementos` ADD `source` text DEFAULT 'ai' NOT NULL;--> statement-breakpoint
ALTER TABLE `escenarios` ADD `source` text DEFAULT 'ai' NOT NULL;--> statement-breakpoint
ALTER TABLE `personajes` ADD `descripcion` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `personajes` ADD `source` text DEFAULT 'ai' NOT NULL;