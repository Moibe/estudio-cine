CREATE TABLE `actos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proyecto_id` integer NOT NULL,
	`numero` integer NOT NULL,
	`titulo` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `escenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proyecto_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `escenarios_proyecto_id_nombre_unique` ON `escenarios` (`proyecto_id`,`nombre`);--> statement-breakpoint
CREATE TABLE `escenas_personajes` (
	`escena_id` integer NOT NULL,
	`personaje_id` integer NOT NULL,
	PRIMARY KEY(`escena_id`, `personaje_id`),
	FOREIGN KEY (`escena_id`) REFERENCES `escenas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`personaje_id`) REFERENCES `personajes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `personajes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proyecto_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personajes_proyecto_id_nombre_unique` ON `personajes` (`proyecto_id`,`nombre`);--> statement-breakpoint
ALTER TABLE `escenas` ADD `acto_id` integer REFERENCES actos(id);--> statement-breakpoint
ALTER TABLE `escenas` ADD `escenario_id` integer REFERENCES escenarios(id);--> statement-breakpoint

-- ===========================================================================
-- Data migration: backfill new tables from existing denormalized escenas data
-- ===========================================================================

-- 1. Backfill `actos` from distinct (proyecto_id, acto_numero, acto_titulo) tuples
INSERT INTO `actos` (`proyecto_id`, `numero`, `titulo`, `created_at`)
SELECT DISTINCT `proyecto_id`, `acto_numero`, `acto_titulo`, unixepoch()
FROM `escenas`;--> statement-breakpoint

-- 2. Backfill `escenarios` from distinct (proyecto_id, encabezado) tuples
--    Uses the full slug as the initial nombre — when escenas are reprocessed
--    by the AI, it will emit a canonical escenario name that may consolidate
--    multiple slug variants (DÍA/NOCHE) under one location.
INSERT INTO `escenarios` (`proyecto_id`, `nombre`, `created_at`)
SELECT DISTINCT `proyecto_id`, `encabezado`, unixepoch()
FROM `escenas`;--> statement-breakpoint

-- 3. Backfill `personajes` from distinct character names per project,
--    flattening the JSON array column with json_each
INSERT INTO `personajes` (`proyecto_id`, `nombre`, `created_at`)
SELECT DISTINCT `e`.`proyecto_id`, `je`.`value`, unixepoch()
FROM `escenas` `e`, json_each(`e`.`personajes`) `je`;--> statement-breakpoint

-- 4. Set escenas.acto_id by matching to the just-inserted acto
UPDATE `escenas` SET `acto_id` = (
    SELECT `a`.`id` FROM `actos` `a`
    WHERE `a`.`proyecto_id` = `escenas`.`proyecto_id`
      AND `a`.`numero` = `escenas`.`acto_numero`
      AND `a`.`titulo` = `escenas`.`acto_titulo`
);--> statement-breakpoint

-- 5. Set escenas.escenario_id by matching to the just-inserted escenario
UPDATE `escenas` SET `escenario_id` = (
    SELECT `esc`.`id` FROM `escenarios` `esc`
    WHERE `esc`.`proyecto_id` = `escenas`.`proyecto_id`
      AND `esc`.`nombre` = `escenas`.`encabezado`
);--> statement-breakpoint

-- 6. Populate escenas_personajes join table from the JSON arrays
INSERT INTO `escenas_personajes` (`escena_id`, `personaje_id`)
SELECT `e`.`id`, `p`.`id`
FROM `escenas` `e`, json_each(`e`.`personajes`) `je`
INNER JOIN `personajes` `p`
    ON `p`.`proyecto_id` = `e`.`proyecto_id`
   AND `p`.`nombre` = `je`.`value`;