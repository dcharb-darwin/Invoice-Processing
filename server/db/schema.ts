import {
    sqliteTable,
    text,
    integer,
    real,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================================
// ENUMS (as const unions — SQLite doesn't support DB-level enums)
// ============================================================

export const PROJECT_TYPES = ["ST", "PA", "FA", "SW"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const CONTRACT_TYPES = ["Design", "CM_Services", "Construction"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const INVOICE_STATUSES = [
    "Received",
    "Logged",
    "Reviewed",
    "Signed",
    "Paid",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const BUDGET_CATEGORIES = [
    "Design",
    "ROW",
    "CM_Services",
    "Construction",
    "Inspector_Material",
    "Permitting",
    "Misc",
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

// ============================================================
// TABLES
// ============================================================

// [trace: discovery L83-87, L356-391 — project entity]
export const projects = sqliteTable("projects", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    cfpNumber: text("cfp_number"), // Capital Facilities Plan number
    projectNumber: text("project_number"), // Standardized across departments
    type: text("type").$type<ProjectType>(), // ST/PA/FA/SW
    description: text("description"),
    status: text("status").default("Active"),
    projectManager: text("project_manager"),
    councilAuthDate: text("council_auth_date"),
    budgetSpreadsheetPath: text("budget_spreadsheet_path"), // URL to source budget spreadsheet [trace: PRD §3.7]
    tasklineProjectId: integer("taskline_project_id"), // Future: API sync
    syncDirection: text("sync_direction"), // "taskline_to_ipc" | "ipc_to_taskline" | null
    lastSyncedAt: text("last_synced_at"), // ISO timestamp of last successful sync
    autoSyncEnabled: integer("auto_sync_enabled", { mode: "boolean" }), // null = use global, true/false = override
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// [trace: discovery L149-155, L89-93 — contracts with supplements]
export const contracts = sqliteTable("contracts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    vendor: text("vendor").notNull(),
    contractNumber: text("contract_number"),
    type: text("type").$type<ContractType>().notNull(), // Design | CM_Services | Construction
    originalAmount: integer("original_amount").notNull().default(0), // cents
    signedDocumentLink: text("signed_document_link"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// [trace: discovery L108, dev-plan L96-98 — supplements as discrete records]
export const contractSupplements = sqliteTable("contract_supplements", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contractId: integer("contract_id").notNull().references(() => contracts.id),
    supplementNumber: integer("supplement_number").notNull(),
    amount: integer("amount").notNull().default(0), // cents
    date: text("date"),
    description: text("description"),
    signedDocumentLink: text("signed_document_link"),
});

// [trace: discovery L100-106 — funding sources with budget codes]
export const fundingSources = sqliteTable("funding_sources", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    sourceName: text("source_name").notNull(),
    springbrookBudgetCode: text("springbrook_budget_code"), // Display-only, never writes to Springbrook
    allocatedAmount: integer("allocated_amount").notNull().default(0), // cents
    yearAllocations: text("year_allocations"), // JSON: { "2025": 50000, "2026": 100000 }
});

// [trace: dev-plan L107-115 — budget line items, auto-populated from contract type]
export const budgetLineItems = sqliteTable("budget_line_items", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    category: text("category").$type<BudgetCategory>().notNull(),
    projectedCost: integer("projected_cost").notNull().default(0), // cents
    // paidToDate: COMPUTED from sum(invoiceTaskBreakdown.amount) — NOT stored
    // balanceRemaining: COMPUTED projectedCost - paidToDate — NOT stored
    // percentSpent: COMPUTED paidToDate / projectedCost — NOT stored
    percentScopeComplete: real("percent_scope_complete").default(0), // 0-100, manual entry or TaskLine sync
});

// [trace: discovery L117-124, dev-plan L117-123 — core transaction record]
export const invoices = sqliteTable("invoices", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    contractId: integer("contract_id").references(() => contracts.id),
    invoiceNumber: text("invoice_number").notNull(), // First-class searchable identifier
    vendor: text("vendor"),
    totalAmount: integer("total_amount").notNull().default(0), // cents
    dateReceived: text("date_received"),
    dateApproved: text("date_approved"),
    status: text("status").$type<InvoiceStatus>().default("Received"),
    grantEligible: integer("grant_eligible", { mode: "boolean" }).default(false),
    grantCode: text("grant_code"),
    sourcePdfPath: text("source_pdf_path"),
    signedPdfPath: text("signed_pdf_path"),
    reviewedBy: text("reviewed_by"),       // Who approved this invoice [trace: human review invariant]
    reviewedAt: text("reviewed_at"),       // When it was approved (ISO timestamp)
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// [trace: dev-plan L125-129 — how each invoice breaks down by task]
export const invoiceTaskBreakdown = sqliteTable("invoice_task_breakdown", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
    budgetLineItemId: integer("budget_line_item_id").references(() => budgetLineItems.id),
    taskCode: text("task_code"),
    taskDescription: text("task_description"),
    amount: integer("amount").notNull().default(0), // cents — rolls up into budgetLineItems.paidToDate
});

// [trace: discovery L488-491, dev-plan L131-134 — ROW tracked by parcel, not invoice]
export const rowParcels = sqliteTable("row_parcels", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    parcelNumber: text("parcel_number").notNull(),
    expenditureType: text("expenditure_type"),
    amount: integer("amount").notNull().default(0), // cents
});

// [trace: 875 Standard — project phases with checklist items]
export const projectPhases = sqliteTable("project_phases", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    name: text("name").notNull(), // Initiation, Planning, Execution, Monitoring/Control, Closure
    order: integer("order").notNull().default(0),
    status: text("status").default("Not Started"), // Not Started | In Progress | Complete
    checklist: text("checklist"), // JSON array: [{item: string, done: boolean}]
});

// [trace: auto-sync — global sync configuration, single-row pattern]
export const SYNC_MODES = ["manual", "auto_taskline_to_ipc", "auto_ipc_to_taskline", "auto_bidirectional"] as const;
export type SyncMode = (typeof SYNC_MODES)[number];

export const syncConfig = sqliteTable("sync_config", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mode: text("mode").$type<SyncMode>().notNull().default("manual"),
    intervalSeconds: integer("interval_seconds").notNull().default(60),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    lastAutoSyncAt: text("last_auto_sync_at"),
    lastAutoSyncResult: text("last_auto_sync_result"), // JSON: {synced: number, errors: string[]}
});

// [trace: unified_xlsx_v1 sync gate]
export const spreadsheetSyncEvents = sqliteTable("spreadsheet_sync_events", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(() => projects.id),
    eventType: text("event_type").notNull(), // validate | import | export
    format: text("format").notNull(), // unified_v1 | eric_legacy | shannon_legacy | unknown
    workbookHash: text("workbook_hash"),
    validationToken: text("validation_token"),
    criticalCount: integer("critical_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    detailsJson: text("details_json"), // JSON payload for diagnostics
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    appliedAt: text("applied_at"),
});

// [trace: finance reconciliation, read-only snapshots]
export const financeTrackerSnapshots = sqliteTable("finance_tracker_snapshots", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fileName: text("file_name").notNull(),
    sourceName: text("source_name"),
    parsedProjects: integer("parsed_projects").notNull().default(0),
    rawJson: text("raw_json"), // Parsed row JSON for traceability
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const FINANCE_DELTA_CATEGORIES = [
    "expected_payment_lag",
    "budget_overrun_risk",
    "code_mismatch",
    "missing_in_finance",
    "missing_in_ipc",
] as const;
export type FinanceDeltaCategory = (typeof FINANCE_DELTA_CATEGORIES)[number];

export const financeDeltaItems = sqliteTable("finance_delta_items", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: integer("snapshot_id").notNull().references(() => financeTrackerSnapshots.id),
    projectId: integer("project_id").references(() => projects.id),
    cfpNumber: text("cfp_number"),
    projectNumber: text("project_number"),
    budgetCode: text("budget_code"),
    category: text("category").$type<FinanceDeltaCategory>().notNull(),
    severity: text("severity").notNull().default("medium"), // low | medium | high
    deltaAmount: integer("delta_amount").default(0), // cents
    message: text("message").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const PUBLIC_SOURCE_TYPES = ["local_file", "public_url"] as const;
export type PublicSourceType = (typeof PUBLIC_SOURCE_TYPES)[number];

export const publicDocumentSources = sqliteTable("public_document_sources", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    sourceType: text("source_type").$type<PublicSourceType>().notNull(),
    location: text("location").notNull(), // local path or URL
    parserHint: text("parser_hint"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const INGEST_RUN_STATUSES = ["running", "completed", "failed"] as const;
export type IngestRunStatus = (typeof INGEST_RUN_STATUSES)[number];

export const publicIngestRuns = sqliteTable("public_ingest_runs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    status: text("status").$type<IngestRunStatus>().notNull().default("running"),
    sourceCount: integer("source_count").notNull().default(0),
    recordCount: integer("record_count").notNull().default(0),
    issueCount: integer("issue_count").notNull().default(0),
    startedAt: text("started_at").notNull().$defaultFn(() => new Date().toISOString()),
    completedAt: text("completed_at"),
});

export const INGEST_RECORD_STATUSES = ["parsed", "review_required", "error"] as const;
export type IngestRecordStatus = (typeof INGEST_RECORD_STATUSES)[number];

export const publicIngestRecords = sqliteTable("public_ingest_records", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runId: integer("run_id").notNull().references(() => publicIngestRuns.id),
    sourceId: integer("source_id").references(() => publicDocumentSources.id),
    recordType: text("record_type").notNull(), // budget | grant | project | unknown
    status: text("status").$type<IngestRecordStatus>().notNull().default("parsed"),
    confidence: real("confidence"),
    message: text("message"),
    provenance: text("provenance"), // source location + parser details JSON
    payloadJson: text("payload_json"), // extracted payload JSON
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const EXTRACTION_DRAFT_STATUSES = ["pending", "approved", "rejected"] as const;
export type ExtractionDraftStatus = (typeof EXTRACTION_DRAFT_STATUSES)[number];

// [trace: extraction draft queue]
export const extractionDrafts = sqliteTable("extraction_drafts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    status: text("status").$type<ExtractionDraftStatus>().notNull().default("pending"),
    fileName: text("file_name").notNull(),
    providerName: text("provider_name").notNull(),
    projectId: integer("project_id").references(() => projects.id),
    extractedJson: text("extracted_json").notNull(),
    mappedJson: text("mapped_json").notNull(),
    overallConfidence: real("overall_confidence"),
    reviewNotes: text("review_notes"),
    approvedInvoiceId: integer("approved_invoice_id").references(() => invoices.id),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    reviewedAt: text("reviewed_at"),
});

// [trace: comprehensive-prd.md §3.9 — extraction feedback loop]
// Stores what the extraction engine proposed vs what the PM actually saved.
// Used for: regex tuning, LLM few-shot examples, vendor auto-detection.
export const extractionFeedback = sqliteTable("extraction_feedback", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id").references(() => invoices.id),
    fileName: text("file_name").notNull(),
    vendorDetected: text("vendor_detected"),       // What extraction thought the vendor was
    vendorCorrected: text("vendor_corrected"),       // What PM saved (null = no correction)
    providerName: text("provider_name").notNull(),   // "local-pdf-parse", "bedrock", etc.
    extractedFields: text("extracted_fields").notNull(), // JSON: full extraction result
    correctedFields: text("corrected_fields").notNull(), // JSON: what PM actually saved
    overallConfidence: real("overall_confidence"),     // 0-1 score from extraction
    hadCorrections: integer("had_corrections", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================================
// RELATIONS
// ============================================================

export const projectsRelations = relations(projects, ({ many }) => ({
    contracts: many(contracts),
    fundingSources: many(fundingSources),
    budgetLineItems: many(budgetLineItems),
    invoices: many(invoices),
    rowParcels: many(rowParcels),
    phases: many(projectPhases),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
    project: one(projects, { fields: [contracts.projectId], references: [projects.id] }),
    supplements: many(contractSupplements),
    invoices: many(invoices),
}));

export const contractSupplementsRelations = relations(contractSupplements, ({ one }) => ({
    contract: one(contracts, { fields: [contractSupplements.contractId], references: [contracts.id] }),
}));

export const fundingSourcesRelations = relations(fundingSources, ({ one }) => ({
    project: one(projects, { fields: [fundingSources.projectId], references: [projects.id] }),
}));

export const budgetLineItemsRelations = relations(budgetLineItems, ({ one, many }) => ({
    project: one(projects, { fields: [budgetLineItems.projectId], references: [projects.id] }),
    taskBreakdowns: many(invoiceTaskBreakdown),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
    contract: one(contracts, { fields: [invoices.contractId], references: [contracts.id] }),
    taskBreakdowns: many(invoiceTaskBreakdown),
    extractionFeedbacks: many(extractionFeedback),
}));

export const invoiceTaskBreakdownRelations = relations(invoiceTaskBreakdown, ({ one }) => ({
    invoice: one(invoices, { fields: [invoiceTaskBreakdown.invoiceId], references: [invoices.id] }),
    budgetLineItem: one(budgetLineItems, {
        fields: [invoiceTaskBreakdown.budgetLineItemId],
        references: [budgetLineItems.id],
    }),
}));

export const rowParcelsRelations = relations(rowParcels, ({ one }) => ({
    project: one(projects, { fields: [rowParcels.projectId], references: [projects.id] }),
}));

export const projectPhasesRelations = relations(projectPhases, ({ one }) => ({
    project: one(projects, { fields: [projectPhases.projectId], references: [projects.id] }),
}));

export const extractionFeedbackRelations = relations(extractionFeedback, ({ one }) => ({
    invoice: one(invoices, { fields: [extractionFeedback.invoiceId], references: [invoices.id] }),
}));

export const spreadsheetSyncEventsRelations = relations(spreadsheetSyncEvents, ({ one }) => ({
    project: one(projects, { fields: [spreadsheetSyncEvents.projectId], references: [projects.id] }),
}));

export const financeTrackerSnapshotsRelations = relations(financeTrackerSnapshots, ({ many }) => ({
    deltaItems: many(financeDeltaItems),
}));

export const financeDeltaItemsRelations = relations(financeDeltaItems, ({ one }) => ({
    snapshot: one(financeTrackerSnapshots, {
        fields: [financeDeltaItems.snapshotId],
        references: [financeTrackerSnapshots.id],
    }),
    project: one(projects, { fields: [financeDeltaItems.projectId], references: [projects.id] }),
}));

export const publicIngestRunsRelations = relations(publicIngestRuns, ({ many }) => ({
    records: many(publicIngestRecords),
}));

export const publicDocumentSourcesRelations = relations(publicDocumentSources, ({ many }) => ({
    records: many(publicIngestRecords),
}));

export const publicIngestRecordsRelations = relations(publicIngestRecords, ({ one }) => ({
    run: one(publicIngestRuns, { fields: [publicIngestRecords.runId], references: [publicIngestRuns.id] }),
    source: one(publicDocumentSources, {
        fields: [publicIngestRecords.sourceId],
        references: [publicDocumentSources.id],
    }),
}));

export const extractionDraftsRelations = relations(extractionDrafts, ({ one }) => ({
    project: one(projects, { fields: [extractionDrafts.projectId], references: [projects.id] }),
    approvedInvoice: one(invoices, {
        fields: [extractionDrafts.approvedInvoiceId],
        references: [invoices.id],
    }),
}));
