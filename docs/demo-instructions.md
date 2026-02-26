# Demo Instructions — Invoice Processing Coordinator

> **For:** Eric, Shannon, and the Lake Stevens Public Works team
> **Prepared by:** Daniel Charboneau / Ngentic AI
> **Date:** 2026-02-25

---

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd LakeStevens.agentic.antigravity
npm install

# Set up database with real project data
npm run db:migrate && npm run db:seed

# Start the app
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Feature Walkthrough

### 1. Portfolio Dashboard (landing page)

**URL:** `http://localhost:5173/#/portfolio`

This is the executive summary view. Shows:
- **Total Projects:** 2 (Eric's Main Street + Shannon's 36th St Bridge)
- **Total Budget:** $1,125,000 across both projects
- **Health indicators:** Green/Yellow/Red based on spend-vs-scope ratio
- Click any project row to drill into detail

**Talking point:** *"This is YOUR data — imported from YOUR spreadsheets. Same projects, same numbers."*

### 2. Projects List

**URL:** `http://localhost:5173/#/`

Project cards with visual budget health bars. Each card shows:
- Project name, PM, contract count
- Budget progress bar (spent vs total)
- Export icon (top-right) to download project as .xlsx

### 3. Project Detail

**URL:** `http://localhost:5173/#/project/1` (Eric's Main Street)

Five tabs:
- **Budget Summary** — category breakdown, % spent vs % scope, health indicators
- **Contracts** — all contracts with supplements (discrete records, not edits)
- **Invoices** — every invoice with task breakdown detail
- **Funding Sources** — TIB grants, utility funds, etc.
- **ROW Parcels** — right-of-way parcels (separate from invoices)

**Gut-Check Alert (live):** *"Permitting is 87% spent but only 50% complete"*

**Export button** in header downloads the full project as .xlsx with 4 tabs.

### 4. Import Page

**URL:** `http://localhost:5173/#/import`

Upload existing spreadsheets:
- Select **Eric (18013_Budget)** or **Shannon (BTR Expense Tracking)** format
- Upload .xlsx → data populates automatically
- Supports re-import for updated spreadsheets

**Talking point:** *"No data entry barrier. Upload your existing spreadsheets and you're live."*

### 5. Invoice Search

**URL:** `http://localhost:5173/#/search`

Cross-project invoice lookup by number — Shannon's primary workflow for grant reimbursement packages.

### 6. Invoice Pipeline

**URL:** `http://localhost:5173/#/pipeline`

Kanban board showing all invoices across all projects in their workflow stage:
- **Received → Logged → Reviewed → Signed → Paid**
- Currently shows 5 invoices distributed across stages

---

## Key Architecture Decisions (for discussion)

1. **The app replaces the spreadsheets** — not a spreadsheet generator
2. **Budget totals are computed** from invoice task breakdowns — no manual totaling
3. **Springbrook codes are display-only** — doesn't write to the financial system
4. **SharePoint stays** for document storage — app adds links to signed contracts
5. **Export to .xlsx** for interoperability during transition

---

## Docker (Alternative Startup)

```bash
docker compose build
docker compose up
```

Opens at http://localhost:5173 with pre-seeded data.
