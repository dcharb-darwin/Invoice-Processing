# Invoice Processing Coordinator — Comprehensive PRD

> **Version:** 0.1.0
> **Status:** DRAFT — Initial stub, pending Module 1 implementation
> **Last Updated:** 2026-02-25
> **Primary Deliverable** — This document IS the product. The prototype code is disposable.

---

## Executive Summary

The Invoice Processing Coordinator is a web application that replaces the manual, inconsistent spreadsheet-based capital project budget tracking used by the City of Lake Stevens Public Works department. It standardizes how project managers (Eric, Shannon) track contracts, invoices, budget line items, and funding sources across 14+ active capital projects.

**Core value proposition:** The app IS the standardized tracker. Not a spreadsheet generator — the app itself replaces the spreadsheets, with import/export for interoperability during transition.

> **Eric:** "Our biggest need right now is just the organization and creating standards for what everyone's doing and making sure that everyone does it the same way."

---

## Full Requirements

> _To be populated as modules are implemented. Each requirement traces to a discovery quote._

### Project Management
- [ ] Create new capital projects from bid/award + contract data
- [ ] Import existing projects from .xlsx spreadsheets
- [ ] Track CFP #, project #, type (ST/PA/FA/SW), project manager
- [ ] Link to TaskLine gen2 project (optional)

### Contract Tracking
- [ ] Three contract types per project: Design, CM Services, Construction
- [ ] Contract supplements as discrete records with signed document links
- [ ] Cumulative total computed from original + supplements

### Invoice Processing
- [ ] Invoice entry with task-level breakdown
- [ ] Invoice number as first-class searchable identifier
- [ ] Status lifecycle: Received → Logged → Reviewed → Signed → Paid
- [ ] Grant eligibility and grant code tracking

### Budget Tracking
- [ ] Budget line items auto-generated from contract type
- [ ] Paid-to-date COMPUTED from invoice task breakdowns (never manual)
- [ ] Balance remaining and % spent auto-calculated
- [ ] Funding sources with Springbrook budget codes (display-only)

### Gut-Check Engine
- [ ] % spent vs % scope complete comparison per budget line item
- [ ] Project-level budget threshold alerts
- [ ] Contract total vs cumulative invoices comparison
- [ ] Visual indicators: green / yellow / red

### Import/Export
- [ ] Import Shannon's BTR Expense Tracking format
- [ ] Import Eric's 18013_Budget format
- [ ] Export to standardized .xlsx
- [ ] Re-import updates existing records (merge by invoice number)

---

## Data Model

> _To be populated when Drizzle schema is implemented (Module 1: Data Foundation)._

---

## Features & Flows

> _To be populated per module implementation._

---

## Acceptance Criteria

> _From `01-development-plan.md` — checked off as implemented._

### V1
- [ ] New project created from contract data → full budget structure auto-generated
- [ ] Eric's Main Street project (18013) imported and displays correctly
- [ ] Shannon's 36th St Bridge imported and displays correctly
- [ ] Invoice entry → budget line item totals auto-update
- [ ] Gut-check flags visible: % spent vs % scope complete, color-coded
- [ ] Export to .xlsx produces a functional spreadsheet
- [ ] Re-import of exported .xlsx updates the app correctly
- [ ] Invoice number searchable across all projects

### V2
- [ ] Invoice pipeline view shows all invoices with status
- [ ] Portfolio dashboard shows budget health for every project
- [ ] Grant reimbursement: filter by grant, select invoices, export package
- [ ] TaskLine integration: projects readable, budget synced
- [ ] Finance view placeholder exists

---

## Gut-Check Engine

> _Detailed rules to be populated during Module 2: Core Logic._

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

---

## Import/Export Standard

> _Detailed column mappings to be populated during Module 4: Interoperability._

---

## Things You Didn't Think Of

_Extracted from `01-development-plan.md` Section: Things You Didn't Think Of_

1. **Seed With Real Data** — Demo shows Eric's and Shannon's actual projects
2. **Import Is the Migration Strategy** — No data entry barrier to adoption
3. **Export Is the Safety Net** — Spreadsheets on SharePoint during transition
4. **The Gut-Check Is Worth More Than the Workflow** — Build in V1, not V2
5. **Contract Supplements Are Discrete Events** — Separate records, not edits
6. **Invoice Task Breakdown Is Source of Truth** — Computed, never manual
7. **ROW Parcels Are Their Own Thing** — Separate table, separate UI
8. **Multi-Project Vendors** — Search/filter by vendor across projects
9. **The 875 Standard Becomes a Template** — Policy through tooling
10. **Finance Engagement Is a Phase Gate** — Placeholder only until Finance is at the table
11. **Lori Controls Rollout** — She's the bottleneck for data access
12. **Eric's Planner Work Is Existing Infrastructure** — Supersede, don't ignore

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

---

## Demo Instructions

> _To be populated via `/generate-demo-package` after V1 is built._

---

## Traceability Matrix

> _Links every requirement to a discovery quote. Populated as modules are implemented._

| Requirement | Discovery Source | Quote |
|-------------|----------------|-------|
| Standardized tracking | `00-discovery-extraction.md` L73 | Eric: "Our biggest need right now is just the organization and creating standards" |
| Invoice number as primary key | `00-discovery-extraction.md` L469-476 | Shannon uses invoice # as primary lookup key |
| Gut-check engine | `00-discovery-extraction.md` L31-32 | Shannon's manual "13% complete — does that sound right?" |
| Three contract types | `00-discovery-extraction.md` L456-463 | Design, CM Services, Construction per project |

---

## PRD Changelog

### v0.1.0 — 2026-02-25
- Initial PRD stub created from discovery extraction and development plan
- All section headers in place
- Acceptance criteria copied from development plan
- Traceability matrix started with key requirements
