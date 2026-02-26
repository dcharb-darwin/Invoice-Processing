# Invoice Processing Coordinator — Build Plan

> Version 4.0
> February 25, 2026
> Daniel Charboneau / Ngentic AI
> Platform: Darwin / Launchpad
> Stack: React 19 / Express / tRPC / SQLite (Drizzle) — same as TaskLine gen2

Rapid prototype build — days, not months. Semi-functional mockup → iterate with customer → PRD for dev team. Same methodology as TaskLine gen2.

All requirements trace back to `00-discovery-extraction.md`.

---

## What We're Building

An app that **is** the standardized capital project budget tracker. Not a spreadsheet generator — the app itself replaces the spreadsheets. Two entry paths:

1. **New projects** — created from a bid/award and contract. The app generates the full budget tracking structure in a standard form automatically.
2. **Existing projects** — imported from current spreadsheets (Eric's, Shannon's). Data stays synced — edits in the app reflect in exports, and re-imports update the app.

Spreadsheet export to SharePoint is an output format for interoperability, especially during initial rollout. It must work both ways — import and export — but the app is the source of truth going forward.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                     LAUNCHPAD                           │
│                                                         │
│  ┌──────────────┐     ┌──────────────────────┐         │
│  │ TaskLine gen2 │◄───►│ Invoice Processing   │         │
│  │ (frozen)      │ API │ Coordinator (NEW)    │         │
│  │               │     │                      │         │
│  │ Projects      │     │ V1: Budget tracker   │         │
│  │ Templates     │     │     from contracts   │         │
│  │ Milestones    │     │     Import/Export     │         │
│  │ Gantt/Cal     │     │     Gut-check alerts  │         │
│  │ Dashboard     │     │                      │         │
│  │               │     │ V2: Workflow mgmt    │         │
│  │               │     │     Pipeline views   │         │
│  │               │     │     TaskLine sync    │         │
│  └───────────────┘     └──────────────────────┘         │
│                                                         │
│  External: SharePoint | Springbrook | Adobe Sign        │
│  (integrate later — not in prototype)                   │
└────────────────────────────────────────────────────────┘
```

**Constraints:**
- Same stack as gen2. No divergence without compelling reason.
- SQLite is fine — coordination layer, not system of record.
- All local with example files. No external integrations in prototype.
- Build for speed → customer iteration → PRD.
- TaskLine gen2 frozen. Consume its API.

---

## V1: The App IS the Tracker (Priority 1)

### Core Concept

When a capital project gets a bid or award and a contract is executed, the app creates the full budget tracking structure automatically in standard form. The PM doesn't build a spreadsheet — the system builds the tracking from the contract data.

**New project flow:**
1. PM enters: project name, CFP #, project #, type (ST/PA/FA/SW)
2. PM enters contract: vendor, contract #, type (Design/CM/Construction), original amount
3. PM enters funding sources: source name, budget code, allocated amount, year breakdown
4. System generates: budget line items, tracking structure, the whole BTR-style view — standardized, every time

**Existing project flow:**
1. PM uploads their current tracking spreadsheet (.xlsx)
2. System parses it — maps columns to the standard data model (handle Shannon's format AND Eric's format)
3. Data imported, now lives in the app
4. PM can continue working in the app, or export back to .xlsx for SharePoint
5. Re-import updates the app — bidirectional sync during transition

### Data Model (SQLite / Drizzle)

```sql
-- Core project record
projects
  id, name, cfpNumber, projectNumber,
  type (ST/PA/FA/SW), description, status,
  projectManager, councilAuthDate,
  tasklineProjectId (nullable — for API sync)

-- Contracts: 3 types per project, with supplements
contracts
  id, projectId, vendor, contractNumber,
  type (Design | CM_Services | Construction),
  originalAmount, signedDocumentLink

contractSupplements
  id, contractId, supplementNumber,
  amount, date, description, signedDocumentLink
  -- cumulativeTotal computed: original + sum(supplements)

-- Where the money comes from
fundingSources
  id, projectId, sourceName,
  springbrookBudgetCode (display-only),
  allocatedAmount, yearAllocations (JSON)

-- Budget categories — auto-populated from contract type
budgetLineItems
  id, projectId,
  category (Design | ROW | CM_Services | Construction |
    Inspector_Material | Permitting | Misc),
  projectedCost,
  -- paidToDate: COMPUTED from sum(invoiceTaskBreakdown.amount)
  -- balanceRemaining: COMPUTED projectedCost - paidToDate
  -- percentSpent: COMPUTED paidToDate / projectedCost
  percentScopeComplete (manual entry or TaskLine sync)

-- The core transaction record
invoices
  id, projectId, contractId, invoiceNumber,
  vendor, totalAmount, dateReceived, dateApproved,
  status (Received | Logged | Reviewed | Signed | Paid),
  grantEligible, grantCode,
  sourcePdfPath, signedPdfPath

-- How each invoice breaks down by task
invoiceTaskBreakdown
  id, invoiceId, budgetLineItemId,
  taskCode, taskDescription, amount
  -- These roll up into budgetLineItems.paidToDate

-- ROW: structurally different, tracked by parcel
rowParcels
  id, projectId, parcelNumber,
  expenditureType, amount
```

**Key design:**
- `invoiceNumber` is indexed, searchable, first-class — Shannon's primary lookup key
- `paidToDate` and `balanceRemaining` are **computed from invoice breakdowns**, not manually entered — the invoice breakdown IS the budget line item source of truth
- `springbrookBudgetCode` is display-only text — never writes to Springbrook
- Contract supplements are discrete records, not edits to a number — each has its own signed doc link
- Three contract types supported per project from day one
- `yearAllocations` as JSON — simple, no join table needed in prototype

### Contract → Budget Structure Auto-Generation

When a contract is created, the system generates the corresponding budget line items:

| Contract Type | Budget Line Items Generated |
|---|---|
| Design | Design, Permitting (optional) |
| CM Services | CM Services, Inspector/Material (optional) |
| Construction | Construction, Misc (optional) |

PM can add/remove/adjust line items after generation. The auto-generation is a starting point, not a constraint.

Funding sources and ROW parcels are entered separately — they're project-level, not contract-level.

### The Gut-Check Engine

This is the killer feature. Shannon's manual process automated:

```
For each budget line item:
  IF percentSpent > percentScopeComplete + threshold:
    FLAG: "Design is 85% spent but only 50% complete"

For each project:
  IF totalSpent > totalBudget * warningThreshold:
    FLAG: "Project is at 90% of total budget"

For each contract:
  IF cumulativeInvoices > contractTotal:
    FLAG: "Invoices exceed contract amount by $X"
```

Visual indicators on every budget view — green/yellow/red. The thing Shannon does in her head ("spent almost all their budget, don't even have 30% design yet") now happens automatically.

### Import/Export (Bidirectional)

**Import from existing spreadsheets:**
- Parse Shannon's BTR Expense Tracking format (both simple and detailed versions)
- Parse Eric's 18013_Budget format (Overview + contract tabs + invoice logs)
- Map columns to standard data model
- Handle variations — Shannon's 32-column breakdown maps differently than Eric's simpler structure
- Merge-safe: re-importing an updated spreadsheet updates existing records by matching on invoice number

**Export to .xlsx:**
- Standard format that merges best of both worlds:
  - Budget Worksheet tab (Shannon's BTR layout)
  - Contract Summary tab (Eric's contract format)
  - Invoice Log tab (Breakdown by task)
  - Overview tab (Eric's Overview with budget codes)
- Drop to SharePoint during rollout — PMs who aren't ready for the app can still get standardized output
- Export includes formulas where appropriate so the spreadsheet is functional standalone

### V1 Scope

| In | Out |
|---|---|
| Project creation from contract/bid data | SharePoint integration |
| Auto-generated budget structure | Springbrook integration |
| Contract + supplement tracking | Adobe Sign integration |
| Invoice entry with task breakdown | Email notifications |
| Computed budget totals from invoices | Automated PDF parsing |
| Gut-check alerts (% spent vs % scope) | Multi-user auth |
| Import from existing .xlsx (Eric + Shannon formats) | Production deployment |
| Export to standardized .xlsx | |
| Seed data from real example files | |
| Invoice search by number | |

### V1 Acceptance Criteria

- [ ] New project created from contract data → full budget structure auto-generated
- [ ] Eric's Main Street project (18013) imported from his spreadsheet and displays correctly
- [ ] Shannon's 36th St Bridge imported from BTR worksheet and displays correctly
- [ ] Invoice entry → budget line item totals auto-update (computed, not manual)
- [ ] Gut-check flags visible: % spent vs % scope complete, color-coded
- [ ] Export to .xlsx produces a functional spreadsheet matching the standard format
- [ ] Re-import of exported .xlsx updates the app correctly (bidirectional)
- [ ] Invoice number searchable across all projects

---

## V2: Full Workflow Management (Priority 2)

"Manage how you want — we'll figure out, map, and make it easy."

V2 builds on V1's data model. The data is already structured. V2 adds the workflow layer.

### Features (iterate with customer)

**Invoice processing pipeline**
Visual Kanban-style view: Received → Logged → Reviewed → Signed → Paid. Drag or click to advance. The approval workflow that currently happens in email/Adobe Sign, made visible.

**Portfolio dashboard**
All projects at a glance. For each: name, type, total budget, total spent, % remaining, health indicator, active contract count, pending invoices. Pulls project metadata from TaskLine if linked.

**Per-project budget dashboard**
The BTR worksheet layout but live — not a spreadsheet. Budget line items with real-time computed totals. Contract summary with supplements. Invoice timeline. Gut-check alerts. All the tabs from the spreadsheet, but interactive.

**Grant reimbursement view**
Filter invoices by grant eligibility and grant code. Select invoices → generate reimbursement package. Replaces Shannon's manual "go to SharePoint, search by invoice number, cross-reference" workflow.

**TaskLine API integration**
- Read projects/tasks from TaskLine gen2 via tRPC
- Sync `actualBudget` back to TaskLine when invoices approved
- Webhook: TaskLine milestone completion → update % scope complete
- Link to TaskLine project detail from Invoice app (and vice versa)

**Finance delta view (placeholder)**
PM pre-payment view alongside Finance's Springbrook data. Read-only placeholder until Finance team is engaged. Show where the view would go, don't build the integration.

### V2 Acceptance Criteria

- [ ] Invoice pipeline view shows all invoices across projects with status
- [ ] Portfolio dashboard shows budget health for every project
- [ ] Grant reimbursement: filter by grant, select invoices, export package
- [ ] TaskLine integration: projects readable, budget synced, milestones update scope %
- [ ] Finance view placeholder exists with explanation of future capability

---

## Things You Didn't Think Of

### 1. Seed With Real Data

We have Eric's 18013_Budget.xlsx, Shannon's BTR worksheets, the Capital Gantt, CIP, CFP. Seed the prototype with actual data from these files. When Eric and Shannon see the demo, they see THEIR projects. That's what makes the demo land.

### 2. Import Is the Migration Strategy

The import capability isn't just a feature — it's the rollout strategy. PMs don't have to re-enter anything. They upload what they have, the app normalizes it, and they're running. No data entry barrier to adoption.

### 3. Export Is the Safety Net

During initial rollout, PMs will want their spreadsheets on SharePoint because that's what they trust. The export gives them that. Over time, they stop exporting because the app is better. But the safety net is what gets them to try it.

### 4. The Gut-Check Is Worth More Than the Workflow

Shannon's manual budget-vs-scope check catches problems before they become crises. Automating this as a visual indicator (green/yellow/red on every budget line item) is the single highest-value feature. Build it in V1, not V2.

### 5. Contract Supplements Are Discrete Events

Eric walked through: original → supplement 1 → supplement 2 → cumulative. Each supplement has its own signed document. They're separate records, not edits. This is in the schema but easy to miss during implementation.

### 6. Invoice Task Breakdown Is the Source of Truth

Budget line item totals are COMPUTED from invoice task breakdowns, not manually maintained. When Shannon logs an invoice broken down by task (PM: $X, surveying: $Y), those amounts roll up automatically. Don't build a separate "update budget totals" workflow — it's automatic.

### 7. ROW Parcels Are Their Own Thing

Right-of-way tracking uses parcel numbers, not invoices. Don't shoehorn it into the invoice model. Separate table, separate UI section in the project view.

### 8. Multi-Project Vendors

Vendors like David Evans appear across multiple projects with different contracts. The data model handles this (contracts are per-project), but the UI needs to handle it gracefully too — search/filter by vendor across projects.

### 9. The 875 Standard Becomes a Template

The 875 Capital Project File Structure defines phases and metadata that nobody enforces. When we create project templates in TaskLine, those templates encode the 875 standard. Policy becomes practice through tooling, not documents.

### 10. Finance Engagement Is a Phase Gate

Don't build Finance features until Finance is at the table. Eric explicitly deferred. Read-only placeholder in V2, real engagement later.

### 11. Lori Controls Rollout

She controls SharePoint access and document logistics. Any rollout needs her capacity. She'll be onboarding files.

### 12. Eric's Planner Work Is Existing Infrastructure

He's already building milestone checklists in Microsoft Planner. TaskLine templates should encode his "cap template" thinking. Don't ignore what he's already built — supersede it by making it better.

---

## Build Order

```
Day 1:  Schema in Drizzle (same patterns as gen2)
        Seed script: parse Eric's 18013_Budget.xlsx + Shannon's BTR
        Basic project/contract/funding source entry UI

Day 2:  Invoice entry with task breakdown
        Computed budget totals (auto from invoice breakdowns)
        Gut-check engine: % spent vs % scope, color-coded indicators
        Contract supplement tracking

Day 3:  Import: parse Shannon and Eric xlsx formats → populate app
        Export: standardized .xlsx output
        Invoice search by number
        Polish V1 — test with real seeded data
        >>> V1 DEMO READY <<<

Day 4:  Portfolio dashboard (all projects, budget health)
        Invoice pipeline view (status progression)
        Per-project budget dashboard (live BTR layout)

Day 5:  TaskLine API integration (read projects, sync budgets)
        Grant reimbursement filtering + package export
        Finance placeholder view
        >>> V2 DEMO READY <<<
```

### Customer Review Points

**After Day 3 (V1):** "Here's your data — Eric's Main Street project, Shannon's 36th St Bridge — imported from your spreadsheets. New projects auto-generate from contracts. The gut-check is automated. You can export to .xlsx for SharePoint. Is this the standard you'd adopt?"

**After Day 5 (V2):** "Here's the dashboard, the pipeline, the portfolio view. TaskLine shows your milestones, this shows your money. What would you change?"

These demos produce the PRD. The prototype IS the requirements document.

---

## Relationship to TaskLine gen2

| Concern | Who Owns It |
|---|---|
| Project creation, templates, milestones, phases | TaskLine gen2 (existing, frozen) |
| Gantt, calendar, task dependencies | TaskLine gen2 |
| Invoice processing, budget tracking, contracts | Invoice Processing Coordinator (new) |
| Portfolio health | Both — TaskLine for project health, Invoice app for financial health |
| Spreadsheet import/export | Invoice app |
| SharePoint/Springbrook/Adobe Sign | Future — later phase or agent layer |
| AI agents | Future — Launchpad layer, calls both APIs |

Integration is lightweight: tRPC calls for project list and budget sync, webhooks for milestone events. Both apps run independently.

**TaskLine gen2 suggested changes:** See `02-taskline-gen2-suggestions.md` — 7 targeted suggestions (mostly trivial) that improve the integration surface without growing TaskLine's scope. The big ones: `externalId` and `metadata` JSON fields on projects, full payload in webhooks, confirm tags are API-writable. Nothing that turns TaskLine into something it isn't.

---

## What This Plan Produces

1. **Working prototype** seeded with real Lake Stevens data (V1: day 3, V2: day 5)
2. **Customer validation sessions** driving the PRD
3. **PRD for dev team** — derived from working prototype + customer feedback
4. **Standardized format** that the team can adopt immediately via import/export
5. **Clear boundary** between project management (TaskLine) and financial tracking (Invoice app)

The prototype is the PRD. Ship fast, iterate with the customer, let the mockup speak louder than wireframes.
