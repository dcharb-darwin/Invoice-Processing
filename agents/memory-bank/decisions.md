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

## DEC-004: Orchestration Dispatch Pattern

**Date:** 2026-02-25
**Decision:** Use `screen -dmS` for dispatching Claude Code and Codex as background workers.
**Rationale:** Direct `run_command` backgrounding causes SIGINT (exit 130). `screen` provides proper process isolation. Codex also needs `script -q` for TTY emulation.
**Impact:** Documented in `docs/agentic-setup-replication-guide.md` — reusable across all projects.

## DEC-005: TaskLine Visual Parity

**Date:** 2026-02-25
**Decision:** Invoice app uses same design language as TaskLine: light-mode default, dark mode toggle, blue-600 accent.
**Rationale:** Separate apps but should feel like the same platform. User explicitly requested visual parity.
**Implementation:** CSS custom properties as design tokens, Tailwind classes for layout.

## DEC-006: Shared UI Primitive Standardization

**Date:** 2026-03-05
**Decision:** Consolidate duplicated status badge, modal shell, entity/source link, and hash route patterns into shared frontend primitives.
**Rationale:** Cross-surface drift was recurring across InvoiceSearch, InvoicePipeline, GrantPackage, and ProjectDetail. Shared infrastructure preserves TaskLine parity while reducing duplication risk.
**Implementation:** `src/components/StatusBadge.tsx`, `src/components/ModalShell.tsx`, `src/components/EntityLink.tsx`, `src/components/SourceDocLink.tsx`, `src/components/InvoiceDocumentLinks.tsx`, `src/lib/routes.ts`, `src/lib/invoiceStatus.ts`.

## DEC-007: Token-First Modal/Panel Styling

**Date:** 2026-03-05
**Decision:** Replace per-file hardcoded gray/indigo modal/panel styling with design-token-driven surfaces and borders.
**Rationale:** Shared structural primitives alone did not eliminate visual drift; token usage in divergent modals/panels keeps light/dark parity and simplifies cross-surface consistency audits.
**Implementation:** `src/pages/NewProjectModal.tsx`, `src/pages/SyncSettings.tsx`, `src/pages/InvoiceDetailPanel.tsx`.
