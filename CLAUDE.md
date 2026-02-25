# CLAUDE.md — Project Instructions for Claude Code

> This file is read automatically by Claude Code CLI when working in this project.
> It syncs with `agents.md` (the master swarm config) — do not diverge.

## Project Overview

**Invoice Processing Coordinator** — Rapid POC for Lake Stevens Capital Projects.
Replaces manual budget-tracking spreadsheets with a standardized app.

**Stack:** React 19 / Express / tRPC / Drizzle / SQLite
**Pattern:** Memory-Governance-Git-Docs-PRD-Rapid-POC-AntiDrift-SkillsLibrary FINAL Edition

## Before Every Session — Read Order (MANDATORY)

1. `agents.md` — swarm config, roles, invariants, skills library
2. `agents/memory-bank/lessons.md` — accumulated learnings
3. `agents/memory-bank/current-state.md` — what's built, what's next
4. `agents/memory-bank/module-registry.json` — module status

## Key Rules

- **This is a rapid POC.** Speed > perfection. Build for demo in hours/days.
- **`docs/comprehensive-prd.md` is the PRIMARY deliverable** — update it after every module.
- **Invoice task breakdown IS the source of truth** for budget line item totals (computed, never manual).
- **Seed with real data:** Eric's 18013 Main Street project + Shannon's 36th St Bridge.
- **Conventional commits** with `[trace: ...]` linking to `00-discovery-extraction.md`.
- **Never push to main** — draft PRs only.

## Skills Library

**Location:** `.agent/skills/` — 12 project-specific skills with SKILL.md files.
Skills are auto-loaded when relevant. Read the SKILL.md for any skill before using it.

Key skills: `xlsx-shannon-parser`, `xlsx-eric-parser`, `drizzle-schema-generator`, `budget-auto-generator`, `gutcheck-engine`, `living-prd-updater`, `anti-drift-auditor`, `reviewer-gate`

## Anti-Drift

AntiDriftAgent checks governance on triggers defined in `agents/memory-bank/anti-drift-config.json`.
Use the `anti-drift-auditor` skill to run audits. Proposes rewind on drift — human confirmation required.

## Source Documents

| Document | Path |
|----------|------|
| Discovery Extraction | `00-discovery-extraction.md` |
| Development Plan | `01-development-plan.md` |
| TaskLine Gen2 Suggestions | `02-taskline-gen2-suggestions.md` |
| Session Transcript | `discovery-session-transcript.txt` |
| Example Spreadsheets | `TaskLine - Project Management and Scheduling/` |

## After Every Change

1. Update `agents/memory-bank/current-state.md`
2. Update `agents/memory-bank/lessons.md` if you learned something
3. Run `living-prd-updater` skill if a module changed
