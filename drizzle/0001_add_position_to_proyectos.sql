ALTER TABLE `proyectos` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `proyectos` SET `position` = -id;