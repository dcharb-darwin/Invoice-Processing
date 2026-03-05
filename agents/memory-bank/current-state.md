# Current State

> Updated after each session. Single source of truth for "what is built" and "what is next."

---

## Last Updated: 2026-03-05T11:20

### What Is Built

**Environment (complete)**
- [x] Git repo, memory bank, swarm config, skills library (12 skills), workflows (6)
- [x] CLIs: Codex v0.105.0, Claude Code v2.1.58 (OAuth)
- [x] Orchestration dispatch pattern: `screen -dmS` for background worker isolation

**Module 1: Data Foundation (COMPLETE)**
- [x] Drizzle schema — 8 tables with relations (projects, contracts, supplements, budgetLineItems, invoices, invoiceTaskBreakdowns, fundingSources, rowParcels)
- [x] `server/db/migrate.ts` — standalone migration runner
- [x] `server/db/seed.ts` — Eric's Main Street + Shannon's 36th St Bridge data
- [x] `server/db/index.ts` — ensures data/ directory exists, WAL mode
- [x] Database seeded and running

**Module 2: Core Logic (COMPLETE)**
- [x] `server/routers/projects.ts` — list (with computed totals), byId (full relations), create
- [x] `server/routers/contracts.ts` — CRUD + budget auto-gen + supplements
- [x] `server/routers/invoices.ts` — CRUD + batch task breakdowns + cross-project search
- [x] `server/routers/fundingSources.ts` — CRUD
- [x] `server/routers/gutcheck.ts` — 3-level alert engine
- [x] `server/routers/export.ts` — .xlsx export with 4 tabs
- [x] `server/routers/import.ts` — Eric + Shannon .xlsx parsers
- [x] `server/routers/grants.ts` — grant reimbursement package support
- [x] `server/router.ts` — all 8 routers wired

**Module 3: User Interactions (COMPLETE)**
- [x] `src/lib/trpc.ts` — tRPC client + React Query
- [x] `src/lib/format.ts` — money/date/percent formatters
- [x] `src/lib/sourceLabels.ts` — generic source reference resolver
- [x] `src/App.tsx` — hash routing, header, dark mode toggle, MVP/Vision toggle
- [x] `src/pages/ProjectsList.tsx` — project cards with budget health bars
- [x] `src/pages/ProjectDetail.tsx` — tabbed view: Budget, Contracts, Invoices, Funding, ROW
- [x] `src/pages/InvoiceSearch.tsx` — cross-project invoice search
- [x] `src/pages/ImportPage.tsx` — spreadsheet import UI
- [x] Restyled to match TaskLine light-mode design (dark mode as toggle)

**Module 4: Interoperability (COMPLETE)**
- [x] Export: project to .xlsx with 4 tabs
- [x] Import: Eric .xlsx parser (Overview, Design, CM, Construction, ROW tabs)
- [x] Import: Shannon .xlsx parser (Budget Worksheet, DEa tab, simple/detailed)

**Module 5: V2 Extensions (COMPLETE)**
- [x] `src/pages/PortfolioDashboard.tsx` — portfolio-level dashboard
- [x] `src/pages/InvoicePipeline.tsx` — invoice pipeline Kanban view
- [x] `src/pages/GrantPackage.tsx` — grant reimbursement package builder

**Module 6: Containerization (COMPLETE)**
- [x] `Dockerfile`, `docker-compose.yml`, `.dockerignore`
- [x] Docker smoke test — image builds, servers start, health + API verified

**Module 7: Documentation (COMPLETE)**
- [x] PRD v1.4.0 — metadata/changelog synchronized and cross-cutting cleanup/consistency section added
- [x] Demo instructions + customer review script
- [x] Agentic setup replication guide
- [x] New package PRDs: `legacy-cleanup-prd.md`, `ui-ux-consistency-prd.md`
- [x] Memory bank synced

**Module 8: Legacy Cleanup + UI/UX Consistency (COMPLETE)**
- [x] Installed external skill toolkit: `doc`, `playwright`, `screenshot`, `spreadsheet`, `pdf`
- [x] Reconciled migration reference drift in memory/governance metadata to current baseline migration name
- [x] Added explicit utility ownership script: `npm run docs:generate-demo`
- [x] Added shared frontend primitives: status badge, modal shell, entity/source links, invoice document link group, route helpers
- [x] Adopted shared primitives across target pages: ProjectsList, NewProjectModal, SyncSettings, ProjectDetail, InvoiceSearch, InvoicePipeline, GrantPackage, InvoiceDetailPanel

**Cross-cutting patterns implemented:**
- [x] Universal contextual navigation (all identifiers are links)
- [x] Source document provenance (📄 View Source on invoices + contracts)
- [x] MVP/Vision view mode toggle
- [x] Shared interaction primitives for status/modals/entity+source links

### What Is Next
- [ ] Add Playwright visual regression suite for desktop/mobile consistency snapshots
- [ ] Continue ProjectDetail decomposition into smaller tab components
- [ ] Enforce `[trace:]` tags on all new commits to restore reviewer-gate compliance trend
- [ ] Push to remote / draft PR workflow

### Blockers
- None currently

### Active Module
All modules complete (2026-03-05)
