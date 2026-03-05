# Invoice Processing Coordinator — Comprehensive PRD

> **Version:** 1.5.0
> **Status:** V1 + V2 COMPLETE — Modules 1-5 implemented
> **Last Updated:** 2026-03-05
> **Primary Deliverable** — This document IS the product. The prototype code is disposable.

---

## 1. Executive Summary

The **Invoice Processing Coordinator** is a web application that replaces the manual, inconsistent spreadsheet-based capital project budget tracking used by the City of Lake Stevens Public Works department. It standardizes how project managers track contracts, invoices, budget line items, and funding sources across 14+ active capital projects.

### Who It Is For

| User | Role | Primary Use Case |
|------|------|-----------------|
| **Shannon** | Project Coordinator | Manages ~7 capital projects (primarily design-phase). Needs detailed task-level invoice breakdowns, standardized budget tracking, and fast invoice number lookup for grant reimbursement packages. [trace: `00-discovery-extraction.md` L12-13] |
| **Eric** | Capital Projects Manager | Manages ~14 capital projects spanning design through construction. Needs a single consolidated view of all project data — contracts, invoices, budget health — with links to signed documents. [trace: `00-discovery-extraction.md` L11] |
| **Daniel** | Ngentic AI / Darwin Consultant | Builds the solution, leads discovery, presents prototype for validation. Converts validated prototype into PRD for dev team. [trace: `00-discovery-extraction.md` L14] |

### Core Value Proposition

The app **IS** the standardized tracker. Not a spreadsheet generator — the app itself replaces the spreadsheets, with import/export for interoperability during transition.

> **Eric:** "Our biggest need right now is just the organization and creating standards for what everyone's doing and making sure that everyone does it the same way." [trace: `00-discovery-extraction.md` L73]

> **Eric:** "What I'm kind of envisioning is we kind of have this one area where you can see all this information about a project. You can see the invoices, how much has been spent, what's the contract total. And then you can get to all those different components of the project from that one view." [trace: `00-discovery-extraction.md` L243]

### Key Design Principles

1. **Invoice task breakdown IS the source of truth** — budget line item totals are computed from invoice breakdowns, never manually entered. [trace: `01-development-plan.md` L125-129, L286-288]
2. **Springbrook budget codes are display-only** — the app never writes to the city's ERP system. [trace: `00-discovery-extraction.md` L51-54, L103]
3. **Import is the migration strategy** — PMs upload existing spreadsheets, the app normalizes the data. No data-entry barrier to adoption. [trace: `01-development-plan.md` L271-273]
4. **Export is the safety net** — standardized .xlsx output for SharePoint interoperability during transition. [trace: `01-development-plan.md` L275-277]
5. **Integrate, don't replace** — SharePoint remains document storage, Springbrook remains financial system. [trace: `00-discovery-extraction.md` L208-209]

---

## 2. Data Model

All monetary values are stored as **integers in cents** to avoid floating-point precision issues. The `formatMoney()` utility converts to display format (`$X,XXX`). Dates are stored as ISO 8601 strings.

### 2.1 `projects` — Capital Project Record

[trace: `00-discovery-extraction.md` L83-87, L356-391]

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `name` | text NOT NULL | Project name (e.g., "18013 Main Street Improvements") |
| `cfpNumber` | text | Capital Facilities Plan number — council-adopted identifier, standardized across departments [trace: `00-discovery-extraction.md` L157-160] |
| `projectNumber` | text | Standardized project number across departments |
| `type` | text | Project type enum: `ST` (Streets), `PA` (Parks), `FA` (Facilities), `SW` (Surface Water) [trace: `00-discovery-extraction.md` L132] |
| `description` | text | Free-text project description |
| `status` | text | Default: "Active" |
| `projectManager` | text | Assigned PM name |
| `councilAuthDate` | text | Council authorization date (manually entered) [trace: `00-discovery-extraction.md` L112] |
| `tasklineProjectId` | integer | Links to TaskLine gen2 project for bidirectional sync [trace: `01-development-plan.md` L87, `02-taskline-gen2-suggestions.md`] |
| `syncDirection` | text | Sync origin: `taskline_to_ipc` \| `ipc_to_taskline` \| null |
| `lastSyncedAt` | text | ISO timestamp of last successful sync |
| `createdAt` | text | ISO timestamp, auto-set |
| `updatedAt` | text | ISO timestamp, auto-set |

**Relations:** Has many `contracts`, `fundingSources`, `budgetLineItems`, `invoices`, `rowParcels`.

### 2.2 `contracts` — Consultant/Contractor Agreements

[trace: `00-discovery-extraction.md` L149-155, L89-93]

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `projectId` | integer FK | References `projects.id` |
| `vendor` | text NOT NULL | Consultant/contractor name (e.g., "David Evans") |
| `contractNumber` | text | Contract identifier |
| `type` | text NOT NULL | Enum: `Design`, `CM_Services`, `Construction` — reflects the three distinct vendor types per project [trace: `00-discovery-extraction.md` L456-463] |
| `originalAmount` | integer | Original contract amount in cents |
| `signedDocumentLink` | text | URL to signed contract PDF (SharePoint link) [trace: `00-discovery-extraction.md` L115] |
| `createdAt` | text | ISO timestamp, auto-set |

**Relations:** Belongs to `projects`. Has many `contractSupplements`, `invoices`.

### 2.3 `contractSupplements` — Contract Amendments

[trace: `00-discovery-extraction.md` L108, `01-development-plan.md` L96-98]

Each supplement is a **discrete record**, not an edit to the original amount. Each has its own signed document. Cumulative total = `originalAmount + sum(supplements.amount)`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `contractId` | integer FK | References `contracts.id` |
| `supplementNumber` | integer NOT NULL | Sequential supplement number (1, 2, 3...) |
| `amount` | integer | Supplement amount in cents |
| `date` | text | Date supplement was executed |
| `description` | text | Description of scope change |
| `signedDocumentLink` | text | URL to signed supplement PDF |

**Relations:** Belongs to `contracts`.

### 2.4 `fundingSources` — Where the Money Comes From

[trace: `00-discovery-extraction.md` L100-106]

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `projectId` | integer FK | References `projects.id` |
| `sourceName` | text NOT NULL | e.g., "FHWA Grant", "TIZ 1", "R2 Main" |
| `springbrookBudgetCode` | text | Springbrook account number — **display-only**, never writes to ERP [trace: `00-discovery-extraction.md` L103-104] |
| `allocatedAmount` | integer | Total allocated in cents |
| `yearAllocations` | text | JSON string: `{"2025": 5000000, "2026": 10000000}` — year-by-year breakdown [trace: `00-discovery-extraction.md` L84] |

**Relations:** Belongs to `projects`.

### 2.5 `budgetLineItems` — Budget Categories

[trace: `01-development-plan.md` L107-115]

Auto-generated when contracts are created. Categories mirror the budget structure from Shannon's BTR worksheets and Eric's project trackers.

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `projectId` | integer FK | References `projects.id` |
| `category` | text NOT NULL | Enum: `Design`, `ROW`, `CM_Services`, `Construction`, `Inspector_Material`, `Permitting`, `Misc` [trace: `00-discovery-extraction.md` L373-379] |
| `projectedCost` | integer | Projected/budgeted cost in cents |
| `percentScopeComplete` | real | 0-100, manual entry or future TaskLine sync |

**Computed fields (not stored):**
- `paidToDate` = `sum(invoiceTaskBreakdown.amount)` where `budgetLineItemId` matches
- `balanceRemaining` = `projectedCost - paidToDate`
- `percentSpent` = `paidToDate / projectedCost * 100`

> **Invariant:** `paidToDate` is ALWAYS computed from invoice task breakdowns, never stored or manually entered. The invoice task breakdown is the single source of truth. [trace: `01-development-plan.md` L139, L286-288]

**Relations:** Belongs to `projects`. Has many `invoiceTaskBreakdown`.

### 2.6 `invoices` — Core Transaction Record

[trace: `00-discovery-extraction.md` L117-124, `01-development-plan.md` L117-123]

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `projectId` | integer FK | References `projects.id` |
| `contractId` | integer FK | References `contracts.id` (nullable — some invoices may not be tied to a contract) |
| `invoiceNumber` | text NOT NULL | **First-class searchable identifier** — Shannon's primary lookup key [trace: `00-discovery-extraction.md` L469-476] |
| `vendor` | text | Vendor name |
| `totalAmount` | integer | Invoice total in cents |
| `dateReceived` | text | Date invoice was received |
| `dateApproved` | text | Date invoice was approved/signed |
| `status` | text | Enum: `Received` → `Logged` → `Reviewed` → `Signed` → `Paid` [trace: `00-discovery-extraction.md` L370-371] |
| `grantEligible` | boolean | Whether invoice is eligible for grant reimbursement |
| `grantCode` | text | Which grant this invoice is coded to [trace: `00-discovery-extraction.md` L41-47] |
| `sourcePdfPath` | text | Path to source invoice PDF |
| `signedPdfPath` | text | Path to signed/approved invoice PDF |
| `createdAt` | text | ISO timestamp, auto-set |

**Relations:** Belongs to `projects`, `contracts`. Has many `invoiceTaskBreakdown`.

### 2.7 `invoiceTaskBreakdown` — How Each Invoice Breaks Down by Task

[trace: `01-development-plan.md` L125-129]

This table is the **source of truth** for budget line item totals. When Shannon logs an invoice broken down by task (PM: $X, surveying: $Y), those amounts roll up automatically into the budget line item's `paidToDate`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `invoiceId` | integer FK | References `invoices.id` |
| `budgetLineItemId` | integer FK | References `budgetLineItems.id` — links this breakdown to a budget category |
| `taskCode` | text | Task identifier code |
| `taskDescription` | text | Description of the task/phase |
| `amount` | integer | Amount allocated to this task in cents — **rolls up into budgetLineItems computed paidToDate** |

**Relations:** Belongs to `invoices`, `budgetLineItems`.

### 2.8 `rowParcels` — Right-of-Way Parcel Tracking

[trace: `00-discovery-extraction.md` L488-491, `01-development-plan.md` L131-134]

ROW tracking is structurally different from invoice-based tracking — it uses parcel numbers, not invoices. Separate table, separate UI section.

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer PK | Auto-increment primary key |
| `projectId` | integer FK | References `projects.id` |
| `parcelNumber` | text NOT NULL | Parcel identifier |
| `expenditureType` | text | Type of ROW expenditure |
| `amount` | integer | Expenditure amount in cents |

**Relations:** Belongs to `projects`.

---

## 3. Features & Flows

### 3.1 ProjectsList — Capital Projects Overview

**Route:** `#/` (default)
**Source:** `src/pages/ProjectsList.tsx`

Displays all capital projects as cards in a responsive grid (1-3 columns). Each card shows:

- **CFP number badge** — blue chip, top-left
- **Project type badge** — top-right (ST/PA/FA/SW)
- **Project name** — clickable, navigates to detail
- **Project manager** and contract count
- **Budget health bar** — horizontal progress bar showing projected cost vs. total budget
  - Green: < 85% utilized
  - Amber: 85-95% utilized
  - Red: > 95% utilized
- **Budget category tags** — small pills showing which categories exist (Design, Construction, etc.)

**Data source:** `trpc.projects.list` — returns all projects with computed `totalBudget` (sum of funding sources) and `totalProjected` (sum of budget line item projected costs).

[trace: `01-development-plan.md` L66-77 — project listing with budget summary]

### 3.2 ProjectDetail — Per-Project Budget Dashboard

**Route:** `#/project/:id`
**Source:** `src/pages/ProjectDetail.tsx`

A comprehensive single-project view with a tabbed interface. This is the live equivalent of Eric's and Shannon's spreadsheet-per-project approach.

[trace: `01-development-plan.md` L239-240 — per-project budget dashboard, live BTR layout]

#### Header

- Back navigation to projects list
- Project name, CFP number badge, type/status badge
- Project manager and project number

#### Gut-Check Alert Banner

Displays all active alerts from the gut-check engine at the top of the page. Each alert shows:
- Colored dot (red or amber)
- Entity name and alert message
- Alerts are computed fresh on each load

[trace: `00-discovery-extraction.md` L31-32 — Shannon's manual "13% complete — does that sound right?"]

#### Summary Cards (4-up grid)

| Card | Value | Accent |
|------|-------|--------|
| Total Budget | Sum of all funding source allocations | — |
| Total Projected | Sum of all BLI projected costs | — |
| Total Paid | Computed from invoice task breakdowns | Warning if > 85% of budget |
| Remaining | Budget minus paid | Danger if > 95% of budget |

#### Tab: Budget Summary

Table view of all budget line items with columns:

| Column | Source |
|--------|--------|
| Category | `budgetLineItems.category` |
| Projected | `budgetLineItems.projectedCost` |
| Paid to Date | **Computed:** sum of invoice task breakdowns for this BLI |
| Balance | **Computed:** projected - paid |
| % Spent | **Computed:** paid / projected * 100 |
| % Scope | `budgetLineItems.percentScopeComplete` |
| Health | Green/yellow/red dot from gut-check engine |

Footer row shows totals. This is the digital equivalent of Shannon's BTR Budget Worksheet tab.

#### Tab: Contracts

Card-based view of each contract showing:
- Vendor name and contract number
- Contract type (Design / CM_Services / Construction)
- Original amount, cumulative total (with supplements), and total invoiced
- On Track / Over status badge (green or red)
- Supplements list with number, description, and amount

[trace: `00-discovery-extraction.md` L149-155 — contracts with supplements]

#### Tab: Invoices

List of all invoices for the project with:
- Invoice number (monospace, blue — primary identifier)
- Status badge (Received/Logged/Reviewed/Signed/Paid) with distinct colors
- Amount, vendor, dates received/approved
- Grant eligibility indicator
- Expandable task breakdown section showing per-task allocations

**Add Invoice form:** Inline form with fields for invoice number, vendor, total amount, date received, contract assignment, status, grant eligibility/code, and dynamic task breakdown rows (select BLI category, enter task code, description, amount).

[trace: `00-discovery-extraction.md` L469-476 — Shannon uses invoice # as primary lookup key]

#### Tab: Funding Sources

Card-based view showing each funding source:
- Source name and total allocated amount
- Springbrook budget code (monospace display)
- Year-by-year allocation breakdown when available

[trace: `00-discovery-extraction.md` L100-106 — funding sources with budget codes]

#### Tab: ROW Parcels

Table view of right-of-way parcel data:
- Parcel number (monospace)
- Expenditure type
- Amount

Empty state message when no parcels recorded.

[trace: `00-discovery-extraction.md` L488-491 — ROW tracked by parcel, not invoice]

### 3.3 InvoiceSearch — Cross-Project Invoice Lookup

**Route:** `#/search`
**Source:** `src/pages/InvoiceSearch.tsx`

Provides a search interface for finding invoices by number across all projects. This directly addresses Shannon's workflow of searching by invoice number for grant reimbursement packages.

- Search input with submit button
- Results show: invoice number, status badge, amount, vendor, date, grant info
- Task breakdown pills shown inline
- Clicking a result navigates to the project detail view
- Uses `LIKE %query%` matching for partial matches

[trace: `00-discovery-extraction.md` L469-476 — invoice number as primary cross-reference key]

### 3.4 Gut-Check Engine — Automated Budget Health Alerts

**Source:** `server/routers/gutcheck.ts`

Automates Shannon's manual "does that sound right?" process. Three levels of alerts, computed on every project load:

[trace: `00-discovery-extraction.md` L31-32, `01-development-plan.md` L159-177]

#### Level 1: Budget Line Item — % Spent vs. % Scope Complete

For each budget line item, compares the percentage of budget spent against the percentage of scope reported complete:

| Condition | Severity | Example |
|-----------|----------|---------|
| `percentSpent > percentScope + 30%` | **Red** | "Design is 85% spent but only 50% complete" |
| `percentSpent > percentScope + 15%` | **Yellow** | "CM_Services is 60% spent but only 40% complete" |
| Within threshold | **Green** | No alert generated |

#### Level 2: Project Budget — Total Spent vs. Total Budget

Compares total paid across all invoices against total allocated budget:

| Condition | Severity |
|-----------|----------|
| `totalPaid > totalBudget * 95%` | **Red** |
| `totalPaid > totalBudget * 85%` | **Yellow** |
| Below 85% | **Green** |

#### Level 3: Contract Overrun — Invoices vs. Contract Total

For each contract, checks if cumulative invoices exceed the contract total (original + supplements):

| Condition | Severity |
|-----------|----------|
| `invoiceTotal > contractTotal` | **Red** — "Invoices exceed contract by $X" |

### 3.5 Import — Spreadsheet Ingestion

**Source:** `server/routers/import.ts`

Two parsers that ingest existing spreadsheets into the standardized data model. Both accept base64-encoded .xlsx files and optionally target an existing project.

[trace: `00-discovery-extraction.md` L356-391, L469-476]

#### Eric Format (`importEricXlsx`)

Parses Eric's multi-tab `18013_Budget` style workbook:

1. **Overview tab** → project metadata (name, CFP #, project #, council auth date, Springbrook budget codes)
2. **Design tab** → Design contract + supplements + invoices
3. **CM tab** → CM_Services contract + supplements + invoices
4. **Construction tab** → Construction contract + supplements + invoices
5. **ROW tab** → parcel data (parcel number, expenditure type, amount)

For each contract tab, the parser:
- Scans top 25 rows for contract metadata (vendor, contract number, original amount, signed doc link)
- Detects supplement rows by regex (`/supplement\s*#?\s*(\d+)/`)
- Finds invoice log header row by scanning for "invoice number" column
- Extracts all invoice rows below the header
- Auto-generates budget line items for the contract type

**Returns:** `{ projectId, projectName, contracts, invoices, parcels, budgetCodes }`

#### Shannon Format (`importShannonXlsx`)

Parses Shannon's BTR Expense Tracking Worksheet:

1. **Budget Worksheet tab** → project name, funding sources (with year allocations), budget line items by category
2. **DEa tab** → Design contract + invoices with optional task-level breakdowns

The parser handles both Shannon's **simple** format (high-level) and **detailed** format (32-column task breakdown):
- Detects format by column count (`maxCols >= 32` = detailed)
- In detailed mode, maps task columns to budget categories using keyword matching (design, inspector, material, permitting, misc, cm, construction, row)
- Uses invoice number as merge key — re-importing updates existing invoices rather than duplicating

**Returns:** `{ projectId, projectName, fundingSources, budgetLineItems, contract, invoices }`

### 3.6 Export — Standardized .xlsx Output

**Source:** `server/routers/export.ts`

Exports a project to a standardized .xlsx workbook with 4 tabs:

| Tab | Contents |
|-----|----------|
| **Overview** | Project name, CFP #, PM, type, status |
| **Budget** | Category, projected cost, paid-to-date (computed), balance — values in dollars |
| **Contracts** | Vendor, type, original amount, supplement total — values in dollars |
| **InvoiceLog** | Invoice number, vendor, amount, status, date — values in dollars |

Returns base64-encoded xlsx data with a suggested filename.

[trace: `01-development-plan.md` L188-196 — export to .xlsx for SharePoint interoperability]

---

### 3.7 Source Reference Drill-and-Display (cross-cutting pattern)

**Applies to:** Every entity that can reference an external source document — contracts (`signedDocumentLink`), invoices (`sourcePdfPath`, `signedPdfPath`), supplements (`signedDocumentLink`), funding sources (future), budget spreadsheets (future).

**Core principle:** If the system stores a reference to an external document, clicking it must either display the actual source material OR honestly communicate that no real source is on file.

#### Source Types (ordered by fidelity)

| Type | Detection | UI Treatment | Example |
|------|-----------|-------------|---------|
| **Real source** | URL ends in `.pdf`, `.xlsx`, `.xls`, `.doc`, `.docx` | Bold blue link: "📄 Source PDF" / "📄 Contract PDF" | Shannon's `David Evans 599518.pdf` |
| **External URL** | URL starts with `http://` or `https://` | Blue link: "🔗 External Link" | Future SharePoint/GDrive links |
| **Demo/mockup** | URL ends in `.html` (local generated file) | Gray italic link: "📄 Demo" | Eric's Main Street invoices (no real PDFs provided) |
| **No source** | Field is null/empty | No link rendered. Optionally: "(no source on file)" text | New records entered manually |

#### Rules

1. **Same record, same treatment everywhere.** If invoice DEA-599518 has a real PDF, every surface that renders this invoice (InvoicesTab, Pipeline, Search, Grants) shows "📄 Source PDF" — not "📄 Source" on one page and nothing on another.
2. **Shared helper, not per-component logic.** Source type detection and label rendering live in a single shared utility (`src/lib/sourceLabels.ts`). Components consume the helper — they never implement detection logic themselves.
3. **Demo content is clearly labeled.** Generated HTML pages include a visible "⚠️ DEMO DOCUMENT" banner. The link text in the app says "📄 Demo" (gray, italic) — never "📄 Source" which implies real material.
4. **Storage is pluggable.** The field stores a URL string. The system makes no assumption about WHERE the file is hosted (local path, SharePoint, GDrive, OneDrive, Box, S3). Authentication is handled by the storage backend, not by this app.
5. **Budget spreadsheets are source documents too.** Each project's budget spreadsheet (Eric's `.xlsx`, Shannon's BTR worksheet) is a source document and should be linkable from the project header.

[trace: agents.md §4 — Source Document Provenance]

---

### 3.8 MVP/Vision Toggle — Discovery-Grounded Feature Classification (cross-cutting pattern)

**Source:** `src/lib/ViewModeContext.tsx`

A top-level toggle in the app header switches between **MVP** (discovery Priority 1 core features) and **Vision** (full feature set including Priority 2/3 stretch goals). Default mode is MVP. Persists to `localStorage` key `"ipc-view-mode"`.

[trace: `00-discovery-extraction.md` L214-234 — Daniel's priority tiers: Priority 1 (basic invoicing), Priority 2 (reporting/stretch), Priority 3 (uber-stretch/templates)]

#### Feature Classification

| Feature | Mode | Discovery Justification |
|---------|------|------------------------|
| Projects List | **MVP** | Eric: "one area where you can see all this information" [L243] |
| Project Detail (Budget, Contracts, Invoices, Funding, ROW) | **MVP** | Priority 1 — the 80-90% invoice workflow [L22-36] |
| Invoice Search | **MVP** | Shannon's primary lookup key for grant reimbursement [L469-476] |
| Import (Eric + Shannon xlsx) | **MVP** | Migration strategy — PMs upload existing spreadsheets |
| Export .xlsx | **MVP** | Safety net for SharePoint interop during transition |
| Gut-Check Alerts | **MVP** | Shannon's manual "does that sound right?" [L31-32] |
| Portfolio Dashboard | **Vision** | Priority 2 stretch — centralized reporting [L221-225] |
| Invoice Pipeline | **Vision** | Priority 2 stretch — cross-project status board |
| Grant Package | **Vision** | Priority 2 stretch — reimbursement package assembly |
| Reconciliation Hub | **Vision** | Finance delta/reconciliation is not part of Priority 1 invoice flow |
| Admin Source Configuration (SharePoint folders/URLs) | **Vision** | External source automation setup requires IT/customer workflow decisions |
| TaskLine Sync (Push/Pull + Auto-Sync) | **Vision** | Priority 3 uber-stretch — TaskLine integration [L228-234] |
| Phases Tab | **Vision** | Priority 3 uber-stretch — template-driven project lifecycle |

#### Behavior

- **MVP mode:** Nav shows Projects, Import, Invoice Search (3 items). Vision-only routes (Portfolio, Pipeline, Grants, Reconciliation, Admin) redirect to projects list. Project Detail hides TaskLine sync buttons and Phases tab.
- **Vision mode:** Nav shows all 8 items, including Reconciliation and Admin source configuration stubs.
- Toggle is a segmented pill: `MVP | Vision` with active state highlighted (blue/indigo).

### 3.9 PDF Invoice Parsing — Provider-Agnostic Extraction Engine

**Source:** `server/lib/extraction/`

[trace: `00-discovery-extraction.md` L370-371 — Shannon's manual invoice transcription, `01-development-plan.md` L188 — PDF parsing future phase]

Automates extraction of invoice data from PDF files, replacing manual transcription into spreadsheets. Uses a **pluggable provider architecture** — local text extraction (MVP), swappable to private GPU or AWS Bedrock models without application layer changes.

#### Architecture: 3-Layer Provider Pattern

1. **Ingestion Layer:** PDF upload via drag-and-drop, stored to `public/documents/invoices/{projectId}/`
2. **Extraction Layer (pluggable):** `ExtractionProvider` interface with:
   - `LocalProvider` — `pdf-parse` + regex patterns (MVP, zero API cost)
   - `BedrockProvider` — AWS Bedrock Claude/Titan (future, requires IAM credentials)
   - `PrivateGPUProvider` — self-hosted model with OpenAI-compatible API (future)
3. **Transform + Review Layer:** Field normalization, confidence scoring, human review UI

#### Provider Interface

```typescript
interface ExtractionProvider {
  name: string;
  extract(pdfBuffer: Buffer): Promise<RawExtraction>;
  isAvailable(): Promise<boolean>;
}
```

`RawExtraction` contains per-field confidence scores (`0.0–1.0`) and vendor-specific field mappings. Provider selection follows priority: PrivateGPU > Bedrock > Local.

#### Vendor Templates

Vendor-specific regex templates handle layout differences:

| Vendor | Task Code Format | Amount Column | Date Format |
|--------|-----------------|---------------|-------------|
| David Evans | 001, 003, SUB01 | "Due This Invoice" | September 12, 2025 |
| Shannon & Wilson | 100, 200, 700 | "Current" | 12/23/2025 |

New vendor templates can be added without modifying core extraction logic.

#### Human Review Flow (MANDATORY)

Extracted data is NEVER auto-saved. The PM sees:
- PDF on the left, pre-filled form on the right
- Confidence badges per field: 🟢 High (≥ 0.85) / 🟡 Medium / 🔴 Low (< 0.5)
- Editable fields before "Save & Create Invoice" commits to database

#### Feature Classification: **MVP**

PDF parsing is MVP because it directly eliminates the single highest-volume repetitive task described in discovery.

### 3.10 Legacy Cleanup + UI/UX Consistency Program (cross-cutting pattern)

This program standardizes repository governance and cross-surface UI behavior while preserving TaskLine visual parity.

**PRD-first requirement:** implementation starts only after:
- `docs/prd-package/legacy-cleanup-prd.md` is updated
- `docs/prd-package/ui-ux-consistency-prd.md` is updated
- this comprehensive PRD changelog/header is synchronized

**Shared infrastructure requirement:** these patterns must be implemented once and consumed everywhere:
- canonical `StatusBadge` mapping for invoice lifecycle states
- shared `ModalShell` behavior (backdrop, close affordances, layout contract)
- shared entity/source-document links (`EntityLink`, `SourceDocLink`)
- canonical hash route helper for project tab deep-links
- shared navigation active-state contract for top-level nav/tab controls

**Affected surfaces (must stay consistent):**
- Project detail (budget/contracts/invoices drill-through)
- Invoice search
- Invoice pipeline
- Grant package
- Template/sync modals

**Navigation visibility + viewport control requirement:**
- active top navigation states (global route nav, project tabs, modal doc tabs) must use high-contrast selected styling with clear active indicator beyond color-only text
- Invoice Pipeline edit modal must support maximize/restore while preserving existing close semantics (escape, backdrop, close button)

**Governance alignment requirement:** migration metadata, module registry, and PRD metadata must reference the same active baseline migration chain.

### 3.11 Unified Spreadsheet Sync + Reconciliation + Ingestion (cross-cutting pattern)

This program defines the transition from ad-hoc spreadsheet interoperability to a governed sync pattern with validation gates, read-only finance reconciliation, and manual-run public document ingestion.

**Canonical source rule:**
- IPC application data is canonical for project operational state.
- Spreadsheet imports are validated before mutation.
- Finance tracker data is read-only and used only for comparison/reporting.

**Unified workbook contract (`unified_xlsx_v1`):**
- Required tabs: `Overview`, `Design`, `ROW Parcels`, `CM Services`, `Construction`, `Funding & Grants`
- Workbook includes hidden metadata tab `IPC_META` with:
  - `formatVersion`
  - `exportedAt`
  - `projectId`
  - `workbookHash`
- Export supports both:
  - legacy 4-tab workbook (`Overview`, `Budget`, `Contracts`, `InvoiceLog`) for backward compatibility
  - default unified 6-tab workbook for department standardization

**Validation gate rule (bidirectional sync definition):**
- Import flow is always: `detectFormat` -> `validate` -> `import`
- Import is blocked when any `critical` issue exists.
- `warning` issues are reported but do not block.
- Critical examples:
  - missing required unified tabs/headers
  - duplicate invoice merge keys in a project
  - unresolvable category mapping for required rows
  - invoice total mismatch against required row sums
  - stale `workbookHash` conflict

**Finance reconciliation rule (read-only):**
- Finance snapshots can be imported and compared to IPC state.
- No writes to finance sources or finance systems.
- Delta categories:
  - `expected_payment_lag`
  - `budget_overrun_risk`
  - `code_mismatch`
  - `missing_in_finance`
  - `missing_in_ipc`

**Public document ingestion rule (manual-run):**
- Data sources are curated local files and approved URLs.
- Manual-run ingestion produces deterministic run reports.
- First-pass parser priority: structured `.xlsx`.
- Non-deterministic or unresolved records are routed to a review queue.

**Invoice extraction hardening rule:**
- Text-PDF extraction remains provider-based.
- Extraction creates drafts first; drafts are never auto-committed as invoices.
- Human approval maps extracted line items to budget line items before save.
- Extraction feedback (`extracted` vs `corrected`) is persisted for tuning.

---

## 4. API Reference

All APIs are exposed via **tRPC** at `/api/trpc`. The server runs on port 3001 with CORS enabled. A health check endpoint exists at `GET /api/health`.

### 4.1 `projects` Router

**Source:** `server/routers/projects.ts`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `projects.list` | query | — | Array of projects with `computed: { totalBudget, totalProjected }` | Lists all projects with budget health. Includes relations: budgetLineItems, fundingSources, contracts (with supplements). |
| `projects.byId` | query | `{ id: number }` | Full project with all relations and `computed: { totalBudget, totalPaid, totalProjected }`. Budget line items include `computed: { paidToDate, balanceRemaining, percentSpent }`. | Single project with deep relations: contracts (supplements, invoices), fundingSources, budgetLineItems, invoices (taskBreakdowns), rowParcels. |
| `projects.create` | mutation | `{ name, cfpNumber?, projectNumber?, type?, description?, projectManager? }` | Created project record | Creates a new capital project. |

### 4.2 `contracts` Router

**Source:** `server/routers/contracts.ts`
[trace: `00-discovery-extraction.md` L149-155, L89-93]

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `contracts.list` | query | `{ projectId: number }` | Array of contracts with supplements and invoices | Lists contracts for a project. |
| `contracts.create` | mutation | `{ projectId, vendor, contractNumber?, type, originalAmount?, signedDocumentLink? }` | Created contract record | Creates contract and **auto-generates budget line items** based on contract type. [trace: `01-development-plan.md` L146-155] |
| `contracts.addSupplement` | mutation | `{ contractId, supplementNumber, amount, date?, description?, signedDocumentLink? }` | Created supplement record | Adds a supplement to an existing contract. |

**Budget Auto-Generation Rules:**

| Contract Type | BLIs Generated |
|--------------|----------------|
| Design | `Design`, `Permitting` (optional) |
| CM_Services | `CM_Services`, `Inspector_Material` (optional) |
| Construction | `Construction`, `Misc` (optional) |

BLIs are only created if they don't already exist for the project (idempotent).

### 4.3 `invoices` Router

**Source:** `server/routers/invoices.ts`
[trace: `00-discovery-extraction.md` L117-124, `01-development-plan.md` L117-129]

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `invoices.list` | query | `{ projectId: number }` | Array of invoices with taskBreakdowns, ordered by dateReceived desc | Lists invoices for a project. |
| `invoices.create` | mutation | `{ projectId, contractId?, invoiceNumber, vendor?, totalAmount, dateReceived?, dateApproved?, status?, grantEligible?, grantCode?, taskBreakdowns[] }` | Created invoice record | Creates invoice with batch task breakdowns. Each breakdown: `{ budgetLineItemId, taskCode?, taskDescription?, amount }`. |
| `invoices.updateStatus` | mutation | `{ id, status, dateApproved? }` | Updated invoice record | Updates invoice status (and optionally approval date). |
| `invoices.search` | query | `{ query: string }` | Array of matching invoices with taskBreakdowns | Cross-project LIKE search on invoice number. [trace: `00-discovery-extraction.md` L469-476] |

### 4.4 `fundingSources` Router

**Source:** `server/routers/fundingSources.ts`
[trace: `00-discovery-extraction.md` L100-106]

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `fundingSources.list` | query | `{ projectId: number }` | Array of funding sources | Lists funding sources for a project. |
| `fundingSources.create` | mutation | `{ projectId, sourceName, springbrookBudgetCode?, allocatedAmount?, yearAllocations? }` | Created funding source | Creates a funding source. yearAllocations is a JSON string. |
| `fundingSources.update` | mutation | `{ id, sourceName?, springbrookBudgetCode?, allocatedAmount?, yearAllocations? }` | Updated funding source | Updates an existing funding source. |

### 4.5 `gutcheck` Router

**Source:** `server/routers/gutcheck.ts`
[trace: `01-development-plan.md` L159-177]

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `gutcheck.forProject` | query | `{ projectId: number }` | Array of `GutCheckAlert` | Computes all budget health alerts for a project. |

**GutCheckAlert shape:**
```typescript
{
  type: "budget_line_item" | "project_budget" | "contract_overrun";
  severity: "green" | "yellow" | "red";
  entityId: number;
  entityName: string;
  message: string;
  percentSpent?: number;
  percentScope?: number;
}
```

### 4.6 `export` Router

**Source:** `server/routers/export.ts`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `export.projectToXlsx` | query | `{ projectId: number }` | `{ base64: string, fileName: string }` | Generates a 4-tab .xlsx workbook for a project. |

### 4.7 `import` Router

**Source:** `server/routers/import.ts`
[trace: `00-discovery-extraction.md` L356-391, L469-476]

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `import.importEricXlsx` | mutation | `{ base64: string, projectId?: number }` | `{ projectId, projectName, contracts, invoices, parcels, budgetCodes }` | Parses Eric's multi-tab format. Creates project if no projectId given. |
| `import.importShannonXlsx` | mutation | `{ base64: string, projectId?: number }` | `{ projectId, projectName, fundingSources, budgetLineItems, contract, invoices }` | Parses Shannon's BTR format. Creates project if no projectId given. Merges invoices by number. |

### 4.8 `spreadsheetSync` Router

**Source:** `server/routers/spreadsheetSync.ts`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `spreadsheetSync.detectFormat` | mutation | `{ base64: string, fileName?: string }` | `{ format, confidence, sheetNames }` | Detects workbook format (`unified_v1`, `eric_legacy`, `shannon_legacy`, `unknown`). |
| `spreadsheetSync.validate` | mutation | `{ base64: string, projectId?: number }` | `{ validationToken, format, criticalIssues[], warnings[], deltaSummary }` | Runs non-mutating validation and produces a token required for gated import. |
| `spreadsheetSync.import` | mutation | `{ base64: string, projectId: number, validationToken: string }` | `{ syncEventId, upserts, warnings }` | Applies import only when validation token is valid and no critical issues were found. |
| `spreadsheetSync.exportUnified` | query | `{ projectId: number }` | `{ base64, fileName, formatVersion, workbookHash }` | Exports standardized 6-tab workbook with `IPC_META` metadata. |
| `spreadsheetSync.roundTripCheck` | query | `{ projectId: number }` | `{ pass, differences }` | Exports unified workbook, re-validates parser compatibility, and reports differences. |

### 4.9 `financeReconciliation` Router

**Source:** `server/routers/financeReconciliation.ts`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `financeReconciliation.importSnapshot` | mutation | `{ base64: string, fileName: string }` | `{ snapshotId, parsedProjects }` | Imports a finance tracker snapshot for read-only comparison. |
| `financeReconciliation.deltaReport` | query | `{ snapshotId?: number }` | `{ summary, items }` | Returns categorized deltas between IPC and finance snapshot data. |

### 4.10 `publicIngest` Router

**Source:** `server/routers/publicIngest.ts`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `publicIngest.run` | mutation | `{ sourceIds?: number[] }` | `{ runId, status }` | Executes manual-run ingestion over curated sources and records deterministic outcomes. |
| `publicIngest.runReport` | query | `{ runId: number }` | `{ metrics, issues, reviewQueueCount }` | Fetches run metrics/issues and unresolved review queue count. |

### 4.11 `extraction` Router (Draft Queue Extensions)

**Source:** `server/routers/extraction.ts`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `extraction.enqueueFromFolder` | mutation | `{ folderPath: string }` | `{ queued }` | Queues supported text-based PDF files from a local folder as extraction drafts. |
| `extraction.listDrafts` | query | `{ status?: "pending" \| "approved" \| "rejected" }` | `{ drafts[] }` | Lists extraction drafts and their review state. |
| `extraction.approveDraft` | mutation | `{ draftId: number, mappedFields }` | `{ invoiceId }` | Human-approved draft -> invoice creation with explicit BLI mapping. |

---

## 5. Import/Export Specification

### 5.1 Eric Format — `18013_Budget` Style

**Tab structure expected:**

| Tab Name (matched by keyword) | Content | Parsed Fields |
|-------------------------------|---------|---------------|
| `overview` | Project metadata | name, cfpNumber, projectNumber, councilAuthDate, Springbrook budget codes |
| `design` | Design contract | vendor, contractNumber, originalAmount, signedDocumentLink, supplements[], invoices[] |
| `cm` | CM Services contract | Same as Design tab |
| `construction` | Construction contract | Same as Design tab |
| `row` | Right-of-way parcels | parcelNumber, expenditureType, amount |

**Contract tab parsing rules:**
- **Metadata region** (rows 0-24): Key-value pairs in columns A-B. Keys matched by lowercase substring:
  - `vendor` / `consultant` / `contractor` → vendor
  - `contract` + `number` / `#` / `no` → contractNumber
  - `original` + `amount` / `contract` → originalAmount
  - `signed` / `document link` → signedDocumentLink
  - `supplement #N` → supplements array
- **Invoice log region**: Header row identified by column containing "invoice" + ("number" / "#" / "no"). Columns auto-mapped: invoiceNumber, amount, dateReceived, vendor. All rows below header until end of data.

**Overview tab parsing rules:**
- Key-value scan: `project name`, `cfp`, `project number`, `council auth/date`, `springbrook` / `budget code`
- Budget codes stored as funding sources with `springbrookBudgetCode` field

**ROW tab parsing rules:**
- Header row identified by column containing "parcel"
- Columns auto-mapped: parcel, type/expenditure, amount/cost

### 5.2 Shannon Format — BTR Expense Tracking

**Tab structure expected:**

| Tab Name (matched by keyword) | Content | Parsed Fields |
|-------------------------------|---------|---------------|
| `budget` (or first tab) | Budget worksheet | projectName, fundingSources[], budgetLineItems[] |
| `dea` / `de a` | Design expense details | vendor, contractNumber, originalAmount, invoices[] with optional taskBreakdowns[] |

**Budget worksheet parsing rules:**
- **Project name**: Scanned in top 10 rows for "project name/title" label, or uses first non-empty cell as fallback
- **Funding sources section**: Detected by "funding" / "source" keyword. Next row is header with year columns (regex: `/20\d{2}/`). Data rows contain source name, year-by-year amounts, and optional total column.
- **Budget categories section**: Detected by "budget" + "category" / "line" / "item" keyword. Category names matched to standard categories: `design→Design`, `inspector/material→Inspector_Material`, `permitting→Permitting`, `misc→Misc`, `cm→CM_Services`, `construction→Construction`, `row→ROW`

**DEa tab parsing rules:**
- **Format detection**: Simple (`maxCols < 32`) vs. Detailed (`maxCols >= 32`)
- **Contract metadata** (rows 0-14): vendor/consultant, contract amount/original, contract number
- **Invoice header row**: Detected by column containing "invoice" + "number/#/no"
- **Simple format**: Invoice number, date, total amount
- **Detailed format**: Invoice number, date, total amount PLUS task breakdown columns. Each non-standard column header is matched to a budget category using keyword matching. Non-zero amounts create task breakdown records.
- **Merge behavior**: If an invoice with the same number already exists for the project, it is **updated** rather than duplicated.

### 5.3 Export Format — Standardized .xlsx

**4-tab workbook structure:**

| Tab | Columns | Notes |
|-----|---------|-------|
| **Overview** | Name, CFP, PM, Type, Status | Single row of project metadata |
| **Budget** | Category, Projected, PaidToDate, Balance | Dollar values (divided by 100 from cents). PaidToDate is computed from invoice task breakdowns at export time. |
| **Contracts** | Vendor, Type, OriginalAmount, Supplements | Dollar values. Supplements is the sum of all supplement amounts. |
| **InvoiceLog** | InvoiceNumber, Vendor, Amount, Status, Date | Dollar values. All invoices for the project. |

---

## 6. Acceptance Criteria

From `01-development-plan.md` — checked off based on implementation state.

### V1 Acceptance Criteria

- [x] **New project created from contract data → full budget structure auto-generated**
  `contracts.create` auto-generates BLIs based on contract type. `projects.create` creates the project. [trace: `01-development-plan.md` L213]

- [x] **Eric's Main Street project (18013) imported from his spreadsheet and displays correctly**
  `import.importEricXlsx` parses Overview, Design, CM, Construction, ROW tabs. Seed script populates initial data. [trace: `01-development-plan.md` L214]

- [x] **Shannon's 36th St Bridge imported from BTR worksheet and displays correctly**
  `import.importShannonXlsx` parses Budget Worksheet and DEa tabs with simple/detailed format detection. [trace: `01-development-plan.md` L215]

- [x] **Invoice entry → budget line item totals auto-update (computed, not manual)**
  `projects.byId` computes `paidToDate` for each BLI from `invoiceTaskBreakdown` records in real-time. [trace: `01-development-plan.md` L216]

- [x] **Gut-check flags visible: % spent vs % scope complete, color-coded**
  `gutcheck.forProject` returns 3-level alerts. `ProjectDetail.tsx` renders them as color-coded banners and health dots. [trace: `01-development-plan.md` L217]

- [x] **Export to .xlsx produces a functional spreadsheet matching the standard format**
  `export.projectToXlsx` generates a 4-tab workbook with Overview, Budget, Contracts, InvoiceLog. [trace: `01-development-plan.md` L218]

- [ ] **Re-import of exported .xlsx updates the app correctly (bidirectional)**
  Shannon parser supports merge-by-invoice-number. Eric parser does not yet deduplicate on re-import. [trace: `01-development-plan.md` L219]

- [x] **Invoice number searchable across all projects**
  `invoices.search` uses LIKE matching. `InvoiceSearch.tsx` provides the UI. [trace: `01-development-plan.md` L220]

### V2 Acceptance Criteria

- [x] **Invoice pipeline view shows all invoices across projects with status**
  `InvoicePipeline.tsx` — Kanban-style board with columns for each invoice status (Received → Logged → Reviewed → Signed → Paid). Drag-and-drop not implemented; status updates via click. Shows all invoices across all projects with source document links. [trace: `01-development-plan.md` L222]

- [x] **Portfolio dashboard shows budget health for every project**
  `PortfolioDashboard.tsx` — Summary metric cards (total projects, total budget, total paid, overall health), sortable table with budget/paid/% spent/% scope/health columns, and health-dot indicators using the same green/amber/red thresholds as the gut-check engine. Click-through to project detail. [trace: `01-development-plan.md` L221]

- [x] **Grant reimbursement: filter by grant, select invoices, export package**
  `GrantPackage.tsx` — Select project and grant code, builds printable reimbursement package showing eligible invoices with source document links. Displays cover sheet with project metadata + itemized invoice table. [trace: `00-discovery-extraction.md` L41-47]

- [x] **TaskLine integration: bidirectional project sync with cross-linking**
  `tasklineSync` router — Two sync flows: (1) Import from TaskLine modal with simulated capital projects, (2) Push to TaskLine from project detail. Sync badges on project cards (🔗 linked / ⚡ local) with clickable deep links to TaskLine project view. `syncDirection` and `lastSyncedAt` fields track sync state. Simulated API stub swappable for real HTTP calls. [trace: `02-taskline-gen2-suggestions.md`, `01-development-plan.md` L245-249]
- [ ] Finance view placeholder exists with explanation of future capability

---

## 7. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | UI framework — same as TaskLine gen2 |
| **Styling** | Tailwind CSS 4 | Utility-first CSS with CSS custom properties for theming |
| **State/Data** | TanStack React Query (via tRPC) | Server state management, caching, auto-refetch |
| **API Client** | tRPC React 11 | End-to-end type-safe API calls |
| **Build** | Vite 6 | Frontend bundler and dev server (port 5173) |
| **Server** | Express 4 | HTTP server (port 3001) |
| **API** | tRPC 11 | End-to-end type-safe RPC layer |
| **Validation** | Zod 3 | Runtime schema validation for all API inputs |
| **ORM** | Drizzle ORM | Type-safe SQL builder with relations |
| **Database** | SQLite (better-sqlite3) | Embedded database, WAL mode — prototype only |
| **Spreadsheets** | SheetJS (xlsx) | .xlsx read/write for import and export |
| **Routing** | Hash-based (custom) | `#/`, `#/project/:id`, `#/search` |
| **Containerization** | Docker + Docker Compose | Single-container deployment for demo |

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  React 19 + Tailwind                             │
│  ├── App.tsx (hash router, header, dark mode,    │
│  │            MVP/Vision toggle)                 │
│  ├── ProjectsList.tsx (card grid)                │
│  ├── ProjectDetail.tsx (5-tab dashboard)         │
│  ├── InvoiceSearch.tsx (cross-project search)    │
│  ├── PortfolioDashboard.tsx (V2: health table)   │
│  ├── InvoicePipeline.tsx (V2: status board)      │
│  ├── GrantPackage.tsx (V2: reimbursement)        │
│  └── ImportPage.tsx (spreadsheet upload)         │
│                                                  │
│  tRPC React Client ──────────────────────┐       │
└──────────────────────────────────────────┼───────┘
                                           │
                                    HTTP /api/trpc
                                           │
┌──────────────────────────────────────────┼───────┐
│                   Server                  │       │
│                                          ▼       │
│  Express + tRPC Middleware                        │
│  ├── projects    (list, byId, create)            │
│  ├── contracts   (list, create, addSupplement)   │
│  ├── invoices    (list, create, updateStatus,    │
│  │                search)                        │
│  ├── fundingSources (list, create, update)       │
│  ├── gutcheck    (forProject)                    │
│  ├── export      (projectToXlsx)                 │
│  ├── import      (importEricXlsx,                │
│  │                importShannonXlsx)             │
│  └── grants      (package support)               │
│                                                  │
│  Drizzle ORM ────────────────────────────┐       │
└──────────────────────────────────────────┼───────┘
                                           │
                                     SQLite (WAL)
                                      data/dev.db
```

---

## Prototype Limitations

> [!CAUTION]
> **This code is a rapid proof-of-concept.** The real dev team should rewrite as needed from the requirements in this PRD.

- No authentication or authorization
- SQLite only — not production-grade for concurrent access
- No external integrations (SharePoint, Springbrook, Adobe Sign)
- No automated PDF/invoice parsing
- No email notifications
- Seeded with example data from 2 projects only
- Not optimized for mobile
- No automated testing suite
- Eric import parser does not deduplicate on re-import (Shannon's does via invoice number merge key)
- Invoice pipeline is view-only (no drag-and-drop status changes)
- TaskLine sync uses simulated API stub (3 sample projects) — swap for real HTTP calls when TaskLine gen2 is deployed
- No Finance delta view (V2)

---

## Traceability Matrix

| Requirement | Discovery Source | Quote / Reference |
|-------------|----------------|-------------------|
| Standardized tracking across PMs | `00-discovery-extraction.md` L73 | Eric: "Our biggest need right now is just the organization and creating standards" |
| Single consolidated project view | `00-discovery-extraction.md` L243 | Eric: "one area where you can see all this information about a project" |
| Invoice number as primary lookup | `00-discovery-extraction.md` L469-476 | Shannon uses invoice # as primary lookup key for grant reimbursement |
| Gut-check engine | `00-discovery-extraction.md` L31-32 | Shannon's manual "13% complete — does that sound right?" |
| Three contract types per project | `00-discovery-extraction.md` L456-463 | Design, CM Services, Construction — three distinct vendor relationships |
| Contract supplements as discrete records | `00-discovery-extraction.md` L108, L115 | Eric: "supplement one, supplement two, all the signed, link directly to the signed" |
| Computed paidToDate from breakdowns | `01-development-plan.md` L125-129, L286-288 | Invoice task breakdown IS the source of truth — never manual |
| Springbrook codes display-only | `00-discovery-extraction.md` L103-104 | Budget codes display-only, never writes to Springbrook ERP |
| Funding sources with year allocations | `00-discovery-extraction.md` L84, L100-106 | Project funding by year (source, 2025, 2026, total) |
| ROW parcels separate from invoices | `00-discovery-extraction.md` L488-491 | ROW uses parcel numbers, structurally different from invoice tracking |
| 7 budget categories | `00-discovery-extraction.md` L373-379 | Design, ROW, CM Services, Construction, Inspector/Material, Permitting, Misc |
| Invoice status lifecycle | `00-discovery-extraction.md` L370-371 | Received → Logged → Reviewed → Signed → Paid |
| Grant eligibility tracking | `00-discovery-extraction.md` L41-47 | Shannon: "I will put which grant it's for" |
| Import Eric's format | `00-discovery-extraction.md` L100-114 | 18013_Budget.xlsx with Overview, Design, ROW, CM, Construction tabs |
| Import Shannon's format | `00-discovery-extraction.md` L81-98 | BTR Expense Tracking: Budget Worksheet, DEa tab, simple vs detailed |
| Export for SharePoint interop | `01-development-plan.md` L188-196 | Export is the safety net — spreadsheets on SharePoint during transition |
| Budget auto-gen from contracts | `01-development-plan.md` L146-155 | Contract type determines which budget line items are created |
| Project types ST/PA/FA/SW | `00-discovery-extraction.md` L132 | Capital Gantt classifies: Streets, Parks, Facilities, Surface Water |
| Council authorization dates | `00-discovery-extraction.md` L112 | Manually entered, future council packet parsing is ~1 year goal |
| Pre-payment focus | `00-discovery-extraction.md` L57-59 | Eric: "I don't really care what we paid... I'm more worried about what we're spending out of" |
| Integrate, don't replace | `00-discovery-extraction.md` L208-209 | Daniel: "Integrate with the systems we have and make your life better" |

---

## PRD Changelog

### v1.4.1 — 2026-03-05
- Added explicit navigation visibility contract to Section 3.10: selected states on top nav/tab controls must be high-contrast and not color-only.
- Added modal viewport control requirement to Section 3.10: Invoice Pipeline edit popup must support maximize/restore with existing close behavior preserved.
- Added PRD package details in `docs/prd-package/ui-ux-consistency-prd.md` under `Navigation Visibility & Modal Viewport Control`.
- Version bumped to reflect cross-surface navigation + modal visibility remediation.

### v1.5.0 — 2026-03-05
- Added Section 3.11 defining system-wide pattern for unified spreadsheet sync (`unified_xlsx_v1`), validation gate semantics, read-only finance reconciliation, manual-run public ingestion, and extraction drafts with human approval.
- Added API reference entries for `spreadsheetSync`, `financeReconciliation`, `publicIngest`, and extraction draft-queue extensions.
- Documented canonical-source policy (IPC canonical, finance read-only) and blocking critical mismatch behavior for import apply.

### v1.4.0 — 2026-03-05
- Added `docs/prd-package/legacy-cleanup-prd.md` defining tracked-file cleanup matrix, migration baseline policy, governance synchronization, and acceptance criteria.
- Added `docs/prd-package/ui-ux-consistency-prd.md` defining shared primitives (`StatusBadge`, `ModalShell`, entity/source links, route helper), cross-surface consistency matrix, and accessibility/responsive requirements.
- Added Section 3.10 in the comprehensive PRD to formalize cross-cutting cleanup + consistency behavior.
- Synchronized PRD header metadata (version/date) with changelog state.

### v1.3.0 — 2026-03-01
- **PDF Invoice Parsing Engine** — Section 3.9 added. Provider-agnostic extraction architecture with pluggable backends (local pdf-parse for MVP, Bedrock/private GPU for future). Vendor-template system, per-field confidence scoring, mandatory human review flow.
- New shared infrastructure: `server/lib/extraction/` directory with provider interface
- Analyzed 2 real invoice PDFs (DEA-599518, SW-161983) to derive extraction patterns
- Grant reimbursement package wiring scoped

### v1.2.0 — 2026-03-01
- **MVP/Vision toggle** — Section 3.8 added. Discovery-grounded feature classification with segmented pill toggle in header. MVP hides Portfolio Dashboard, Invoice Pipeline, Grant Package, TaskLine Sync, and Phases tab.
- New shared infrastructure: `src/lib/ViewModeContext.tsx`
- Version bumped to reflect MVP/Vision toggle addition

### v1.1.0 — 2026-02-26
- **V2 features documented** — PortfolioDashboard, InvoicePipeline, GrantPackage now in acceptance criteria
- Architecture diagram updated with all 8 pages and 8 routers
- Prototype limitations trimmed — removed items that are actually built
- MVP/Vision toggle noted in architecture diagram
- Version bumped to reflect V2 completion

### v1.0.0 — 2026-02-25
- **Complete rewrite** — all 7 sections populated from actual implementation
- Executive Summary: users, value proposition, design principles with discovery traces
- Data Model: all 8 tables with field-level descriptions and trace references
- Features & Flows: all 3 pages, gut-check engine, import/export fully documented
- API Reference: all 7 tRPC routers with 17 procedures documented
- Import/Export Specification: exact parsing rules for Eric, Shannon, and export formats
- Acceptance Criteria: V1 items checked against implementation, V2 items listed
- Technology Stack: full stack table with architecture diagram
- Traceability Matrix: 21 requirements traced to discovery documents
- Prototype Limitations: updated to reflect current state

### v0.1.0 — 2026-02-25
- Initial PRD stub created from discovery extraction and development plan
- All section headers in place
- Acceptance criteria copied from development plan
- Traceability matrix started with key requirements
