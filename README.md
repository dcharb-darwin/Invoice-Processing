# Invoice Processing Coordinator

A web application that replaces manual, spreadsheet-based capital project budget tracking for the City of Lake Stevens Public Works department. It standardizes how project managers track contracts, invoices, budget line items, and funding sources across 14+ active capital projects.

> **"Our biggest need right now is just the organization and creating standards for what everyone's doing and making sure that everyone does it the same way."** — Eric, Capital Projects Manager

## Key Features

- **Project Dashboard** — Per-project budget view with contracts, invoices, funding sources, and ROW parcels in a tabbed interface
- **Invoice Tracking** — Full lifecycle from Received → Logged → Reviewed → Signed → Paid, with task-level breakdowns that auto-compute budget line item totals
- **Gut-Check Engine** — Automated budget health alerts: % spent vs. % scope complete, project budget utilization, contract overrun detection
- **Spreadsheet Import** — Ingest existing Excel workbooks (Eric's multi-tab format and Shannon's BTR format) into the standardized data model
- **Export** — Standardized `.xlsx` output for SharePoint interoperability
- **Cross-Project Invoice Search** — Look up any invoice by number across all projects
- **PDF Invoice Parsing** — Provider-agnostic extraction engine with vendor templates, confidence scoring, and mandatory human review
- **Portfolio Dashboard** — Bird's-eye view of budget health across all projects
- **Invoice Pipeline** — Kanban-style status board for all invoices
- **Grant Reimbursement Packages** — Filter by grant, select invoices, export package
- **TaskLine Integration** — Bidirectional project sync with deep linking and budget aggregation
- **MVP/Vision Toggle** — Switch between core MVP features and full vision feature set

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4 |
| API | tRPC 11 (end-to-end type-safe) |
| Server | Express 5 |
| Database | SQLite (better-sqlite3) via Drizzle ORM |
| Build | Vite 7 |
| Spreadsheets | SheetJS (xlsx) |
| PDF Parsing | pdf-parse + vendor-specific regex templates |
| Validation | Zod |

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Initialize database (migrate + seed demo data)
npm run db:migrate
npm run db:seed

# Start dev servers (frontend on :5173, API on :3001)
npm run dev
```

### Docker

```bash
docker compose up --build
```

## Project Structure

```
├── src/                    # React frontend
│   ├── pages/              # Route-level page components
│   ├── components/         # Shared UI components
│   └── lib/                # Context providers, utilities
├── server/                 # Express + tRPC backend
│   ├── routers/            # tRPC route handlers
│   ├── db/                 # Drizzle schema, migrations, seed
│   ├── lib/extraction/     # PDF parsing engine
│   └── syncEngine.ts       # TaskLine sync engine
├── public/documents/       # Demo contracts, invoices, budgets
├── docs/                   # PRD, discovery docs, customer review package
│   ├── comprehensive-prd.md
│   ├── discovery/          # Original discovery session artifacts
│   ├── prd-package/        # Feature-specific PRDs
│   └── customer-review-package/
└── .agent/skills/          # Agentic workflow skills
```

## Architecture

```
Browser (React + Tailwind)
    │
    ├── tRPC React Client
    │
    ▼  HTTP /api/trpc
Server (Express + tRPC)
    │
    ├── projects, contracts, invoices, fundingSources
    ├── gutcheck, export, import, extraction
    ├── tasklineSync, syncConfig, templates
    │
    ▼
SQLite (Drizzle ORM, WAL mode)
```

## Data Model

The core entities are: **Projects** → **Contracts** (with Supplements) → **Invoices** (with Task Breakdowns) → **Budget Line Items**. Invoice task breakdowns are the single source of truth for budget calculations — totals are always computed, never manually entered.

Additional entities: **Funding Sources** (with Springbrook budget codes), **ROW Parcels** (parcel-based tracking, separate from invoices).

All monetary values are stored as **integers in cents** to avoid floating-point precision issues.

## Documentation

- [Comprehensive PRD](docs/comprehensive-prd.md) — Full product requirements with discovery traceability
- [Discovery Extraction](docs/discovery/00-discovery-extraction.md) — Original discovery session analysis
- [Development Plan](docs/discovery/01-development-plan.md) — Implementation roadmap
- [Customer Review Package](docs/customer-review-package/) — Demo walkthrough materials

## License

Proprietary — Darwin Government Solutions
