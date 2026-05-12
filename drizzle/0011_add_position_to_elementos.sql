ALTER TABLE `elementos` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `elementos` SET `position` = -id;
