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

// ============================================================
// RELATIONS
// ============================================================

export const projectsRelations = relations(projects, ({ many }) => ({
    contracts: many(contracts),
    fundingSources: many(fundingSources),
    budgetLineItems: many(budgetLineItems),
    invoices: many(invoices),
    rowParcels: many(rowParcels),
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
