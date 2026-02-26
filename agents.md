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

## 2. ORCHESTRATOR PROTOCOL (executable — Antigravity is the orchestrator)

**Antigravity is the ORCHESTRATOR, not a worker.** It reads this file, plans work, dispatches to agent roles, monitors results, and reports to the user. It does NOT directly edit component files unless the change is trivial (< 5 lines, single file, no cross-cutting impact).

### 2.1 Mandatory Init Sequence (every conversation)

Before responding to ANY user request that involves code changes:
1. `view_file` → `.agents/workflows/pattern-first-dispatch.md` (read the enforcement workflow)
2. `view_file` → `docs/comprehensive-prd.md` (understand current system state)
3. Decide: is this a **pattern** or a **one-off fix**? Answer in planning artifact.
4. If pattern → update PRD first, then dispatch. If one-off → dispatch directly.

### 2.2 Agent Roles → Tool Mapping

| Role | How Orchestrator Executes It | When |
|------|------------------------------|------|
| **PlannerAgent** | Orchestrator does this itself (PLANNING mode) | Always first |
| **DataModelAgent** | Orchestrator edits schema/seed directly (small scope) | Schema changes |
| **BusinessLogicAgent** | Orchestrator edits routers directly (small scope) | API changes |
| **FrontendAgent** | Orchestrator edits components — BUT only after shared helpers exist | UI changes |
| **ReviewerAgent** | `browser_subagent` to verify + orchestrator self-review against PRD checklist | After every change |
| **TesterAgent** | `browser_subagent` with specific test scenarios | After implementation |
| **DocumentationAgent** | Orchestrator updates PRD, demo-instructions, walkthrough | Before and after |
| **AntiDriftAgent** | Read `anti-drift-auditor` skill, run governance checks | Every 10 tool calls |

### 2.3 Gating Rules (hard enforcement)

1. **No component edit without shared infrastructure.** If the same pattern appears in 2+ files, create a shared helper/component FIRST, then apply to all surfaces in one pass.
2. **No code before PRD.** The design goes in `docs/comprehensive-prd.md` before the first line of implementation code.
3. **No data-specific logic.** Never write `if (projectId === X)` or reference a specific vendor/PM by name in application code (seed data is excepted).
4. **Skills check before domain work.** Before any domain-specific task (parsing, import, export, budget calc), `view_file` the relevant skill's `SKILL.md`.
5. **Cross-cutting verification.** After ANY UI change, verify that every page showing the same entity type renders consistently (`browser_subagent`).

### 2.4 Multi-Agent CLI Support

- **Antigravity** (Gemini) — primary orchestrator, reads this file
- **Claude Code** — reads `CLAUDE.md` (synced with this file)
- **Codex CLI** — reads `codex-instructions.md` (synced with this file)

All agents share the same `agents/memory-bank/` and `.agent/skills/` for continuity.

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
- Seed with real data immediately — examples provided are for modeling patterns, not hardcoding specifics.
- Semi-functional = clickable flows, computed gut-checks, import/export working.
- Prototype code is disposable; PRD is permanent.
- Never spend more than 30 minutes on a single component before showing progress.
- If blocked, skip and return — demo momentum is everything.
- **Design-Pattern-First Thinking:** This app is a foundational micro-app that demonstrates patterns. Specific examples (Eric's 18013, Shannon's Bridge) are inputs we model from — they are NOT the product. Always design features as general-purpose patterns that work for ANY project, ANY vendor, ANY PM. Never hardcode for a specific person or dataset. When building, ask: "Does this work for a project we haven't seen yet?" If no, rethink.
- **Universal Contextual Navigation (architectural pattern):** Every rendered data element that references another entity is a navigation target. This is the foundational interaction pattern for the entire app:
  1. **Identifiers are links.** Invoice numbers, contract numbers, project names — wherever they appear in ANY page — are clickable and navigate to the entity's primary context (e.g., invoice # → project invoices tab, contract # → project contracts tab).
  2. **Cross-page references navigate.** If page A shows data from entity B, clicking B's identifier navigates to B's home page/tab. No static text for identifiers.
  3. **Source documents are always linked.** If a record has a source document (`sourcePdfPath`, `signedDocumentLink`), a 📄 link appears next to the identifier everywhere it's rendered. Not just on the record's home page — on EVERY surface where that record appears.
  4. **In-context drilldown before navigate-away.** Prefer inline expand (accordion, detail panel) over full page navigations. But the expanded view MUST contain links to navigate deeper when needed.
  5. **Visual affordance.** If clicking does something, the user must know: cursor changes, text is blue/underlined, hover states, or explicit "→" indicators. No invisible clicks.
- **Source Document Provenance:** Every data element traces back to its original source material. This is a design pattern, not a feature: when data enters the system (import, manual entry, API), the system records WHERE it came from. Schema fields store the link (`sourcePdfPath`/`signedPdfPath` on invoices, `signedDocumentLink` on contracts). The storage backend is pluggable — the URL is just a string per record (local path, SharePoint, GDrive, OneDrive, Box). Every UI that shows these records displays "📄 View Source" links that open in a new tab. For the demo, link to real source PDFs where they exist; use generated mockups only where no real document is available.

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
