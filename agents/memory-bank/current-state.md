# Current State

> Updated after each session. Single source of truth for "what is built" and "what is next."

---

## Last Updated: 2026-02-25T18:42

### What Is Built

**Environment (complete)**
- [x] Git repo, memory bank, swarm config, skills library (12 skills), workflows
- [x] CLIs: Codex v0.105.0, Claude Code v2.1.58 (OAuth)
- [x] Orchestration dispatch pattern: `screen -dmS` for background worker isolation

**Module 1: Data Foundation (COMPLETE)**
- [x] Drizzle schema — 8 tables with relations (projects, contracts, supplements, budgetLineItems, invoices, invoiceTaskBreakdowns, fundingSources, rowParcels)
- [x] `server/db/migrate.ts` — standalone migration runner
- [x] `server/db/seed.ts` — Eric's Main Street + Shannon's 36th St Bridge data (fixed async/await)
- [x] `server/db/index.ts` — ensures data/ directory exists, WAL mode
- [x] Database seeded and running

**Module 2: Core Logic (COMPLETE)**
- [x] `server/routers/projects.ts` — list (with computed totals), byId (full relations), create
- [x] `server/routers/contracts.ts` — CRUD + budget auto-gen (skill: budget-auto-generator) + supplements
- [x] `server/routers/invoices.ts` — CRUD + batch task breakdowns + cross-project search
- [x] `server/routers/fundingSources.ts` — CRUD
- [x] `server/routers/gutcheck.ts` — 3-level alert engine (skill: gutcheck-engine)
- [x] `server/routers/export.ts` — .xlsx export with 4 tabs (built by Claude Code worker)
- [x] `server/router.ts` — all 6 routers wired

**Module 3: User Interactions (COMPLETE)**
- [x] `src/lib/trpc.ts` — tRPC client + React Query
- [x] `src/lib/format.ts` — money/date/percent formatters
- [x] `src/App.tsx` — hash routing, header, dark mode toggle
- [x] `src/pages/ProjectsList.tsx` — project cards with budget health bars
- [x] `src/pages/ProjectDetail.tsx` — tabbed view: Budget, Contracts, Invoices, Funding, ROW
- [x] `src/pages/InvoiceSearch.tsx` — cross-project invoice search
- [x] Restyled to match TaskLine light-mode design (dark mode as toggle)

**Module 4: Interoperability (PARTIAL)**
- [x] Export: `server/routers/export.ts` — project to .xlsx (Claude Code built)
- [ ] Import: Eric .xlsx parser (skill: xlsx-eric-parser)
- [ ] Import: Shannon .xlsx parser (skill: xlsx-shannon-parser)

**Module 5: Containerization (PARTIAL)**
- [x] `Dockerfile`, `docker-compose.yml`, `.dockerignore` (Codex built)
- [ ] Docker smoke test

**Module 6: Documentation (STALE — needs update)**
- [ ] PRD does not reflect Modules 2-4 implementation
- [ ] Memory bank was stale (fixing now)

### What Is Next
- [ ] Run anti-drift audit (overdue by governance rules)
- [ ] Update PRD for Modules 2-4
- [ ] Docker smoke test
- [ ] Dispatch import parsers to workers
- [ ] Git commit with [trace:] tags

### Blockers
- None currently

### Active Module
Module 4: Interoperability (import parsers)
