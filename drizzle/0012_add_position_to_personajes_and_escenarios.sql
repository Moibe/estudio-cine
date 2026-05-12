ALTER TABLE `escenarios` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `personajes` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `escenarios` SET `position` = -id;
--> statement-breakpoint
UPDATE `personajes` SET `position` = -id;
