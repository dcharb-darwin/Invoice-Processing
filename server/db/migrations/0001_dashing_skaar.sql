ALTER TABLE `projects` ADD `sync_direction` text;
--> statement-breakpoint
ALTER TABLE `projects` ADD `last_synced_at` text;