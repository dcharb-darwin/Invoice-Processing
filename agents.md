# ANTIGRAVITY SWARM — Swarm-Driven Spreadsheet Standardization
**Project:** Invoice Processing Coordinator (V1 → V2)
**Pattern Version:** 2026-02-25 Memory-Governance-Git-Docs-PRD-Rapid-POC-AntiDrift-SkillsLibrary FINAL Edition
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
**Files (auto-created):** agents.md, lessons.md, decisions.md, current-state.md, module-registry.json, invariants.md, anti-drift-config.json

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
9. **AntiDriftAgent** (periodic + event-triggered) — governance, drift detection, rewind proposals

**Multi-Agent CLI Support:**
- **Antigravity** (Gemini) — primary orchestrator, reads this file
- **Claude Code** — reads `CLAUDE.md` (synced with this file)
- **Codex CLI** — reads `codex-instructions.md` (synced with this file)

All three agents share the same `agents/memory-bank/` and `.agent/skills/` for continuity.

---

## 3. SKILLS LIBRARY STRATEGY (2026 Claude Code / Antigravity Best Practices)

**Location:** `.agent/skills/` (Antigravity-native, 100% cross-compatible with Claude Code `.claude/skills/`, Cursor, Copilot, Codex — write once, use everywhere)

**Structure per Skill** (enforced on creation):
- Subfolder (kebab-case, e.g. `xlsx-shannon-parser/`)
  - `SKILL.md` (required)
    - YAML frontmatter (name, description, triggers, version) — always loaded for discovery
    - Body: Overview, When to Use, Core Instructions, Examples, Success Criteria
  - `scripts/` (optional — Python/Bash for deterministic tasks; agents run with `--help` first)
  - `references/` (optional — docs, examples)
  - `assets/` (optional — templates)

**2026 Best Practices (enforced by DocumentationAgent + AntiDriftAgent):**
- Progressive disclosure: Frontmatter always in context; full body only when relevant; references loaded on demand (saves tokens)
- Single responsibility — one focused capability per skill
- Concise: Body < 400 tokens
- Composability: No assumption of being the only skill
- Clear triggers in YAML for auto-activation
- Git-versioned: Skills committed with draft PRs

**Project-Specific Skills (auto-created during init):**

| # | Skill | Purpose |
|---|-------|---------|
| 1 | `xlsx-shannon-parser` | Parses Shannon's BTR Expense Tracking formats |
| 2 | `xlsx-eric-parser` | Parses Eric's 18013_Budget style spreadsheets |
| 3 | `drizzle-schema-generator` | Creates Drizzle models + migrations from discovery schema |
| 4 | `budget-auto-generator` | Contract → budget line items auto-generation |
| 5 | `gutcheck-engine` | Computes & flags %spent vs %scope |
| 6 | `living-prd-updater` | Maintains docs/comprehensive-prd.md |
| 7 | `anti-drift-auditor` | Runs governance checks, detects drift |
| 8 | `git-worktree-manager` | Creates/prunes worktrees + draft PRs |
| 9 | `demo-package-generator` | Screenshots, instructions, handover zip |
| 10 | `traceability-enforcer` | Adds [trace:] comments to commits |
| 11 | `skill-creator-meta` | Meta-skill to generate new skills on demand |
| 12 | `reviewer-gate` | Standardized ReviewerAgent workflow |

**Skills are auto-loaded** by Antigravity/Claude when relevant — no manual slash commands needed.

---

## 4. RAPID POC INVARIANTS (enforced)

- Build for demo-readiness in hours/days.
- Seed with real Eric 18013 + Shannon 36th St Bridge data immediately.
- Semi-functional = clickable flows, computed gut-checks, import/export working.
- Prototype code is disposable; PRD is permanent.
- Never spend more than 30 minutes on a single component before showing progress.
- If blocked, skip and return — demo momentum is everything.
- **In-Context Drilldown Principle:** If we show data anywhere, clicking it must reveal source detail in-context (inline expand, not just navigate away). Every rendered element is a potential drilldown target.
- **Pluggable Document Storage:** Every invoice, contract, and supplement links to its original source material (PDF, scan, etc.). The URL is a simple string — for Lake Stevens it's SharePoint (`https://lakestevenswa.sharepoint.com/...`); other orgs may use GDrive, OneDrive, Box, or local paths. Schema fields: `sourcePdfPath`/`signedPdfPath` (invoices), `signedDocumentLink` (contracts). Every UI that shows these records must display "📄 View Source" links that open in a new tab.

---

## 4.5 PRD-FIRST HOLISTIC DESIGN (enforced on every dispatch)

**Problem Solved:** Workers building features in isolation create inconsistent UX, siloed logic, and miss cross-cutting concerns. The PRD is the system's brain — workers must think with it.

**Rules:**

1. **Every dispatch prompt MUST include:** "Read CLAUDE.md (or codex-instructions.md) AND docs/comprehensive-prd.md first for full system context."
2. **Design principles are system-wide, not per-component.** When adding a feature to one page, the dispatch must specify how it relates to other pages that show the same data. (Example: if Pipeline shows invoices, and ProjectDetail shows invoices, and Search shows invoices — an invoice drilldown behavior must be consistent across ALL THREE.)
3. **PRD is updated BEFORE implementation** (not after). The DocumentationAgent or orchestrator adds the feature to the PRD first, establishing the expected behavior, then dispatches the implementation.
4. **Cross-cutting concerns checklist** (included in every dispatch):
   - Does this feature affect data shown on other pages?
   - Does clicking this data behave consistently across every page it appears on?
   - Does the styling match the system-wide design tokens?
   - Is the new feature connected to existing navigation (deep-links, back buttons)?

**Dispatch Template (updated):**
```
"Read CLAUDE.md AND docs/comprehensive-prd.md first for full architecture and design context.

SYSTEM CONTEXT: [Brief summary of how this feature relates to other pages/components]
DESIGN PRINCIPLE: [Any cross-cutting principle that applies, e.g., in-context drilldown]
TASK: [Specific implementation instructions]"
```

---

## 5. ANTI-DRIFT AGENT (periodic)

Triggers: every 30 min, after 5k tokens, after 10 tool calls, after every handoff, or `/run-anti-drift-audit`.
Proposes rewind on any drift (human confirmation required).

**Config:** `agents/memory-bank/anti-drift-config.json`
**Skill used:** `anti-drift-auditor`

Checks:
- Memory bank files are consistent and up-to-date
- No invariant violations
- PRD reflects implemented state
- All commits have `[trace:]` tags
- Module registry matches filesystem
- Skills library is intact

---

## 6. LIVING PRD STRATEGY (PRIMARY DELIVERABLE)

**Location:** `docs/comprehensive-prd.md` (auto-updated after every module + every AntiDrift check)

**Skills used:** living-prd-updater, demo-package-generator, traceability-enforcer

**Human Review Gate:** Every PRD update creates a draft PR that **requires human approval** before merge.

---

## 7. GIT & VERSION CONTROL (2026 Best Practices)

- One git worktree per module
- Draft PRs only (never push directly to main)
- Conventional commits with `[trace: ...]`
- Protected main + CI + Reviewer + human approval
- PR template includes PRD update summary

---

## 8. STRICT HANDOFF PROTOCOL

```
Specialist → worktree → commit → draft PR
  → Reviewer + Tester + AntiDrift + Skills check
  → DocumentationAgent updates PRD
  → Human review gate on PRD
  → Planner merges → prune worktree
```

---

## 9. MODULES

| Order | Module | Description |
|-------|--------|-------------|
| 1 | Data Foundation | Drizzle schema, seed scripts, migrations |
| 2 | Core Logic | tRPC routers, gut-check engine, computed fields |
| 3 | User Interactions | React UI — project/contract/invoice entry, budget views |
| 4 | Interoperability | .xlsx import (Eric + Shannon formats), export |
| 5 | V2 Extensions | Portfolio dashboard, invoice pipeline, TaskLine sync |
| 6 | Documentation & PRD | Parallel — updated after every module |

---

## 10. DAILY COMMANDS

```
Initialize Swarm-Driven Spreadsheet Standardization with Memory-Governance-Git-Docs-PRD-Rapid-POC-AntiDrift-SkillsLibrary FINAL Edition
Start Data Foundation Module
Run anti-drift-audit
Update living PRD for CoreLogic
Generate demo package
Create new skill <name>              # uses meta skill-creator
Finalize handover
Run governance-audit
```
