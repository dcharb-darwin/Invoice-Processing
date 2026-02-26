# Codex CLI — Project Instructions

> This file provides context for OpenAI Codex CLI when working in this project.
> It syncs with `agents.md` (the master swarm config) — do not diverge.

## Project Overview

**Invoice Processing Coordinator** — Rapid POC for Lake Stevens Capital Projects.
Replaces manual budget-tracking spreadsheets with a standardized app.

**Stack:** React 19 / Express / tRPC / Drizzle / SQLite / Tailwind CSS / SheetJS
**Pattern:** Memory-Governance-Git-Docs-PRD-Rapid-POC-AntiDrift-SkillsLibrary FINAL Edition

## Architecture Map (ALWAYS reference before building)

```
server/
├── index.ts              ← Express server, tRPC middleware, port 3001
├── trpc.ts               ← tRPC init, superjson transformer
├── router.ts             ← Root router — 7 sub-routers wired here
├── db/
│   ├── schema.ts         ← Drizzle ORM — 8 tables, relations, type unions
│   ├── index.ts          ← DB connection (better-sqlite3, WAL mode)
│   ├── seed.ts           ← Real data: Eric's Main Street + Shannon's 36th St Bridge
│   └── migrate.ts        ← Standalone migration runner
└── routers/
    ├── projects.ts       ← list (computed budget totals), byId (full relations), create
    ├── contracts.ts      ← CRUD + auto budget line items (skill: budget-auto-generator)
    ├── invoices.ts       ← CRUD + batch task breakdowns + cross-project search
    ├── fundingSources.ts ← CRUD
    ├── gutcheck.ts       ← 3-level alert engine (BLI, project, contract)
    ├── export.ts         ← Project → .xlsx (4 tabs: Overview, Budget, Contracts, InvoiceLog)
    └── import.ts         ← Eric + Shannon xlsx parsers (813 lines)

src/
├── main.tsx              ← React entry, tRPC + React Query providers
├── index.css             ← Tailwind CSS + design tokens (light/dark mode)
├── App.tsx               ← Hash routing, header, dark mode toggle
├── lib/
│   ├── trpc.ts           ← tRPC React client
│   └── format.ts         ← formatMoney(cents), formatDate, formatPercent
└── pages/
    ├── ProjectsList.tsx  ← Project cards with budget health bars
    ├── ProjectDetail.tsx ← Tabbed: Budget, Contracts, Invoices, Funding, ROW
    └── InvoiceSearch.tsx ← Cross-project search by invoice number
```

## Database Schema (8 tables)

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `projects` | name, cfpNumber, projectManager, type, status | Root entity |
| `contracts` | vendor, type (Design/CM_Services/Construction), originalAmount | Amount in cents |
| `contractSupplements` | supplementNumber, amount, description | Discrete records, not edits |
| `budgetLineItems` | category, projectedCost, percentScopeComplete | Tied to project |
| `invoices` | invoiceNumber, totalAmount, status, vendor, dateReceived | Amount in cents |
| `invoiceTaskBreakdowns` | budgetLineItemId, taskCode, amount | SOURCE OF TRUTH for budget totals |
| `fundingSources` | sourceName, allocatedAmount, yearAllocations (JSON) | Amount in cents |
| `rowParcels` | parcelNumber, expenditureType, amount | Separate from invoices |

## Critical Conventions

- **All monetary values stored in cents** (divide by 100 for display)
- **`await` on ALL Drizzle operations** — even for SQLite, Drizzle v0.45+ returns Promises
- **Invoice task breakdowns compute budget totals** — never build manual "update totals"
- **Contract supplements are discrete records** — never edit original amount
- **Use `[trace: ...]` in commits** linking to discovery doc lines
- **Design matches TaskLine** — light mode default, blue-600 accent, Inter font

## Before Every Session — Read Order (MANDATORY)

1. `agents.md` — swarm config, roles, invariants, skills library
2. `agents/memory-bank/lessons.md` — accumulated learnings (PITFALLS HERE)
3. `agents/memory-bank/current-state.md` — what's built, what's next
4. `agents/memory-bank/module-registry.json` — module status

## Skills Library

**Location:** `.agent/skills/` — 12 project-specific skills with SKILL.md files.
Read the SKILL.md for any skill before using it.

| Skill | When to Use |
|-------|------------|
| `xlsx-eric-parser` | Importing Eric's 18013_Budget style spreadsheets |
| `xlsx-shannon-parser` | Importing Shannon's BTR Expense Tracking formats |
| `budget-auto-generator` | Auto-gen budget line items from contract type |
| `gutcheck-engine` | Computing budget health alerts |
| `living-prd-updater` | Updating docs/comprehensive-prd.md |
| `drizzle-schema-generator` | Creating Drizzle ORM schema from discovery |

## Source Documents

| Document | Path |
|----------|------|
| Discovery Extraction | `docs/discovery/00-discovery-extraction.md` |
| Development Plan | `docs/discovery/01-development-plan.md` |
| Session Transcript | `docs/discovery/discovery-session-transcript.txt` |

## After Every Change

1. Update `agents/memory-bank/current-state.md`
2. Update `agents/memory-bank/lessons.md` if you learned something
3. Run `living-prd-updater` skill if a module changed
