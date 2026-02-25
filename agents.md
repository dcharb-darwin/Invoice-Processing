# ANTIGRAVITY SWARM — Swarm-Driven Spreadsheet Standardization
**Project:** Invoice Processing Coordinator (V1 → V2)
**Pattern Version:** 2026-02-25 Memory-Governance-Git-Docs-PRD-Rapid-POC FINAL Edition
**Stack:** React 19 / Express / tRPC / Drizzle / SQLite (exact TaskLine gen2 match)
**Source of Truth:** `00-discovery-extraction.md` + `01-development-plan.md` + `discovery-session-transcript.txt`

**Core Philosophy (enforced on every agent start — READ EVERY TIME)**
This swarm builds a **rapid proof-of-concept / semi-functional mockup** — NOT production code.
- Speed and fidelity to discovery are paramount.
- Code is experimental/disposable (for customer validation only).
- The **living comprehensive PRD** in `docs/comprehensive-prd.md` is the PRIMARY, VITAL deliverable.
- Real dev team may completely ignore/rebuild the prototype code — the PRD contains the true requirements.
- Daniel's methodology: "The prototype IS the PRD."

---

## 1. MEMORY & GOVERNANCE LAYER (mandatory)

**Brain Folder:** `agents/memory-bank/`
**Files (auto-created):** agents.md, lessons.md, decisions.md, current-state.md, module-registry.json, invariants.md

**Strict read order:** agents.md → lessons.md → current-state.md → module-registry.json

---

## 2. AGENT ROLES

1. **PlannerAgent** (Claude Code Plan Mode / Antigravity Planning)
2. **DataModelAgent** — Drizzle schema, migrations, seed scripts
3. **BusinessLogicAgent** — tRPC routers, gut-check engine, computed fields
4. **FrontendAgent** — React 19 components, dashboards, forms
5. **ImportExportAgent** — .xlsx parsing (SheetJS), export generation
6. **ReviewerAgent** (mandatory gatekeeper) — reviews all PRs and PRD changes
7. **TesterAgent** (browser-in-loop) — acceptance criteria verification
8. **DocumentationAgent** — maintains living PRD + demo package

**Multi-Agent CLI Support:**
- **Antigravity** (Gemini) — primary orchestrator, reads this file
- **Claude Code** — reads `CLAUDE.md` (synced with this file)
- **Codex CLI** — reads `codex-instructions.md` (synced with this file)

All three agents share the same `agents/memory-bank/` for continuity.

---

## 3. RAPID POC INVARIANTS (enforced)

- Build for demo-readiness in hours/days.
- Seed with real Eric 18013 + Shannon 36th St Bridge data immediately.
- Semi-functional = clickable flows, computed gut-checks, import/export working.
- Prototype code is disposable; PRD is permanent.
- Never spend more than 30 minutes on a single component before showing progress.
- If blocked, skip and return — demo momentum is everything.

---

## 4. LIVING PRD STRATEGY (PRIMARY DELIVERABLE)

**Location:** `docs/comprehensive-prd.md` (auto-created and updated)

**Automatic Sections Maintained by DocumentationAgent**
- Executive Summary
- Full Requirements (traced to discovery)
- Data Model + diagrams
- Features & Flows (updated per module)
- Acceptance Criteria (checked off live)
- Gut-Check Engine
- Import/Export Standard
- **Things You Didn't Think Of** (full extraction from 01-dev-plan)
- Prototype Limitations (explicit "this code is POC — rewrite as needed")
- Demo Instructions + Customer Review Script
- Traceability Matrix
- PRD Changelog & Versioning

**Skills:** `/update-living-prd <module>`, `/regenerate-full-prd`, `/generate-demo-package`, `/finalize-handover`, `/governance-audit`

**Human Review Gate:** Every PRD update creates a draft PR that **requires human approval** before merge.

---

## 5. GIT & VERSION CONTROL (2026 Best Practices)

- One git worktree per module (when applicable)
- Draft PRs only (never push directly to main)
- Conventional commits with `[trace: ...]` linking to discovery requirements
- Protected main + CI + Reviewer + human approval
- PR template includes PRD update summary

---

## 6. MODULES

| Order | Module | Description |
|-------|--------|-------------|
| 1 | Data Foundation | Drizzle schema, seed scripts, migrations |
| 2 | Core Logic | tRPC routers, gut-check engine, computed fields |
| 3 | User Interactions | React UI — project/contract/invoice entry, budget views |
| 4 | Interoperability | .xlsx import (Eric + Shannon formats), export |
| 5 | V2 Extensions | Portfolio dashboard, invoice pipeline, TaskLine sync |
| 6 | Documentation & PRD | Parallel — updated after every module |

---

## 7. STRICT HANDOFF PROTOCOL

```
Specialist → worktree → commit → draft PR
  → Reviewer + Tester
  → DocumentationAgent updates PRD
  → Human review gate on PRD
  → Planner merges → prune worktree
```

---

## 8. SETUP (completed)

1. ✅ Discovery docs uploaded to workspace
2. ✅ Git repo initialized
3. ✅ Memory bank created (`agents/memory-bank/`)
4. ✅ Living PRD stub created (`docs/comprehensive-prd.md`)
5. ✅ Workflows created (`.agents/workflows/`)
6. ✅ Cross-agent configs: `CLAUDE.md`, `codex-instructions.md`

---

## 9. DAILY COMMANDS

```
/update-living-prd <module>     — Update PRD after module work
/regenerate-full-prd            — Full PRD regeneration from source docs
/generate-demo-package          — Create demo instructions + screenshots
/finalize-handover              — Zip PRD + seed data + demo instructions
/governance-audit               — Verify memory bank, PRD, invariants
```
