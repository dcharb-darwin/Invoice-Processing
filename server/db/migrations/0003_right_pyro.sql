CREATE TABLE `sync_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL,
	`interval_seconds` integer DEFAULT 60 NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`last_auto_sync_at` text,
	`last_auto_sync_result` text
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `auto_sync_enabled` integer;