# Architecture & Design Decisions

> Record every significant decision with rationale. Link to discovery quotes where applicable.

---

## DEC-001: Stack Selection — React 19 / Express / tRPC / Drizzle / SQLite

**Date:** 2026-02-25
**Decision:** Match the TaskLine gen2 stack exactly.
**Rationale:** Same patterns as gen2, easy integration, shared knowledge. SQLite is fine — this is a coordination layer, not a system of record.
**Source:** `01-development-plan.md` line 7

## DEC-002: The App IS the Tracker

**Date:** 2026-02-25
**Decision:** The app replaces the spreadsheets, not generates them. Export to .xlsx is an output format for interoperability.
**Rationale:** Direct quote from dev plan: "Not a spreadsheet generator — the app itself replaces the spreadsheets."
**Source:** `01-development-plan.md` lines 17-23

## DEC-003: Invoice Task Breakdown as Source of Truth

**Date:** 2026-02-25
**Decision:** Budget line item totals are COMPUTED from invoice task breakdowns, never manually maintained.
**Rationale:** When Shannon logs an invoice broken down by task, those amounts roll up automatically. No separate "update budget totals" workflow.
**Source:** `01-development-plan.md` lines 286-288, `00-discovery-extraction.md` line 139
