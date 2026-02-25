# Codex CLI — Project Instructions

> This file provides context for OpenAI Codex CLI when working in this project.
> It syncs with `agents.md` (the master swarm config) — do not diverge.

## Project Overview

**Invoice Processing Coordinator** — Rapid POC for Lake Stevens Capital Projects.
Replaces manual budget-tracking spreadsheets with a standardized app.

**Stack:** React 19 / Express / tRPC / Drizzle / SQLite

## Before Every Session — Read Order (MANDATORY)

1. `agents.md` — swarm config, roles, invariants
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
3. Run `/update-living-prd <module>` workflow if a module changed
