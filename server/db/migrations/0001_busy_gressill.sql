CREATE TABLE `extraction_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`file_name` text NOT NULL,
	`provider_name` text NOT NULL,
	`project_id` integer,
	`extracted_json` text NOT NULL,
	`mapped_json` text NOT NULL,
	`overall_confidence` real,
	`review_notes` text,
	`approved_invoice_id` integer,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `finance_delta_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` integer NOT NULL,
	`project_id` integer,
	`cfp_number` text,
	`project_number` text,
	`budget_code` text,
	`category` text NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`delta_amount` integer DEFAULT 0,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `finance_tracker_snapshots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `finance_tracker_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_name` text NOT NULL,
	`source_name` text,
	`parsed_projects` integer DEFAULT 0 NOT NULL,
	`raw_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_document_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source_type` text NOT NULL,
	`location` text NOT NULL,
	`parser_hint` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_ingest_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`source_id` integer,
	`record_type` text NOT NULL,
	`status` text DEFAULT 'parsed' NOT NULL,
	`confidence` real,
	`message` text,
	`provenance` text,
	`payload_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `public_ingest_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `public_document_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `public_ingest_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`record_count` integer DEFAULT 0 NOT NULL,
	`issue_count` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `spreadsheet_sync_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`event_type` text NOT NULL,
	`format` text NOT NULL,
	`workbook_hash` text,
	`validation_token` text,
	`critical_count` integer DEFAULT 0 NOT NULL,
	`warning_count` integer DEFAULT 0 NOT NULL,
	`details_json` text,
	`created_at` text NOT NULL,
	`applied_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
