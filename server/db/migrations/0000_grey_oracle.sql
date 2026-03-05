CREATE TABLE `budget_line_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`category` text NOT NULL,
	`projected_cost` integer DEFAULT 0 NOT NULL,
	`percent_scope_complete` real DEFAULT 0,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contract_supplements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contract_id` integer NOT NULL,
	`supplement_number` integer NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`date` text,
	`description` text,
	`signed_document_link` text,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`vendor` text NOT NULL,
	`contract_number` text,
	`type` text NOT NULL,
	`original_amount` integer DEFAULT 0 NOT NULL,
	`signed_document_link` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extraction_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer,
	`file_name` text NOT NULL,
	`vendor_detected` text,
	`vendor_corrected` text,
	`provider_name` text NOT NULL,
	`extracted_fields` text NOT NULL,
	`corrected_fields` text NOT NULL,
	`overall_confidence` real,
	`had_corrections` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `funding_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`source_name` text NOT NULL,
	`springbrook_budget_code` text,
	`allocated_amount` integer DEFAULT 0 NOT NULL,
	`year_allocations` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_task_breakdown` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`budget_line_item_id` integer,
	`task_code` text,
	`task_description` text,
	`amount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_line_item_id`) REFERENCES `budget_line_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`contract_id` integer,
	`invoice_number` text NOT NULL,
	`vendor` text,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`date_received` text,
	`date_approved` text,
	`status` text DEFAULT 'Received',
	`grant_eligible` integer DEFAULT false,
	`grant_code` text,
	`source_pdf_path` text,
	`signed_pdf_path` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_phases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Not Started',
	`checklist` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cfp_number` text,
	`project_number` text,
	`type` text,
	`description` text,
	`status` text DEFAULT 'Active',
	`project_manager` text,
	`council_auth_date` text,
	`budget_spreadsheet_path` text,
	`taskline_project_id` integer,
	`sync_direction` text,
	`last_synced_at` text,
	`auto_sync_enabled` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `row_parcels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`parcel_number` text NOT NULL,
	`expenditure_type` text,
	`amount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL,
	`interval_seconds` integer DEFAULT 60 NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`last_auto_sync_at` text,
	`last_auto_sync_result` text
);
