# Agentic Multi-Agent Setup — Replication Guide

> **Author:** Daniel Charboneau / Ngentic AI
> **Last Verified:** 2026-02-25
> **Agents:** Antigravity (Gemini) + Claude Code + Codex CLI
> **Auth:** OAuth (ChatGPT login for Codex, Anthropic account for Claude Code)

Copy this file to any new project and follow the steps below. Takes ~5 minutes.

---

## Prerequisites

| Tool | Install | Verify |
|------|---------|--------|
| **Node.js** ≥ 18 | `brew install node` or [nodejs.org](https://nodejs.org) | `node --version` |
| **npm** | Comes with Node | `npm --version` |
| **Git** | `brew install git` | `git --version` |
| **Codex CLI** | `npm install -g @openai/codex` | `codex --version` |
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` | `claude --version` |

### First-time OAuth setup (one-time per machine)

```bash
# Codex — opens browser for ChatGPT OAuth
codex login

# Claude Code — opens browser for Anthropic OAuth
claude
# (follow the prompt on first run)
```

---

## Step 1: Initialize the Project

```bash
# Create and enter your project directory
mkdir ~/Documents/MyProject && cd ~/Documents/MyProject

# Initialize git
git init
git config user.email "dcharb78@gmail.com"
git config user.name "Daniel Charboneau"
```

---

## Step 2: Create `.gitignore`

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.next/
.env
.env.local
.env.*.local
.DS_Store
npm-debug.log*
*.db
*.sqlite
*.sqlite3
.gemini/

# Exclude large binaries if needed (uncomment as appropriate)
# *.mp3
# *.pptx
# *.docx
# *.pdf
EOF
```

---

## Step 3: Create `agents.md` (Swarm Config)

This is the master config file read by Antigravity. Customize the placeholders (`<PROJECT_NAME>`, `<STACK>`, `<SOURCE_DOCS>`, etc.) for each project.

```bash
cat > agents.md << 'AGENTSEOF'
# ANTIGRAVITY SWARM — <PROJECT_NAME>
**Project:** <PROJECT_NAME>
**Pattern Version:** Memory-Governance-Git-Docs-PRD-Rapid-POC-AntiDrift-SkillsLibrary
**Stack:** <STACK e.g. React 19 / Express / tRPC / Drizzle / SQLite>
**Source of Truth:** <list your source/discovery docs>

**Core Philosophy (enforced on every agent start — READ EVERY TIME)**
This swarm builds a **rapid proof-of-concept** — NOT production code.
- Speed and fidelity to discovery are paramount.
- The **living comprehensive PRD** in `docs/comprehensive-prd.md` is the PRIMARY deliverable.
- Prototype code is disposable; PRD is permanent.

---

## 1. MEMORY & GOVERNANCE LAYER (mandatory)

**Brain Folder:** `agents/memory-bank/`
**Files:** agents.md, lessons.md, decisions.md, current-state.md, module-registry.json, invariants.md, anti-drift-config.json

**Strict read order:** agents.md → lessons.md → current-state.md → module-registry.json

---

## 2. AGENT ROLES

1. PlannerAgent (orchestrator)
2. DataModelAgent
3. BusinessLogicAgent
4. FrontendAgent
5. ImportExportAgent
6. ReviewerAgent (mandatory gatekeeper)
7. TesterAgent (browser-in-loop)
8. DocumentationAgent (living PRD + demo package)
9. AntiDriftAgent (periodic + event-triggered)

**Multi-Agent CLI Support:**
- **Antigravity** (Gemini) — reads this file
- **Claude Code** — reads `CLAUDE.md`
- **Codex CLI** — reads `codex-instructions.md`

All agents share `agents/memory-bank/` and `.agent/skills/`.

---

## 3. SKILLS LIBRARY

**Location:** `.agent/skills/` (cross-compatible with Claude Code, Cursor, Copilot, Codex)

Each skill is a subfolder with `SKILL.md` (YAML frontmatter + instructions).
Use the `skill-creator-meta` skill to generate new skills on demand.

---

## 4. ANTI-DRIFT AGENT

Triggers: every 30 min, after 5k tokens, after 10 tool calls, after every handoff.
Proposes rewind on drift (human confirmation required).
Config: `agents/memory-bank/anti-drift-config.json`

---

## 5. HANDOFF PROTOCOL

Specialist → worktree → commit → draft PR → Reviewer + Tester + AntiDrift → DocumentationAgent updates PRD → Human review → merge → prune worktree

---

## 6. GIT

- Draft PRs only
- Conventional commits with `[trace: ...]`
- One git worktree per module
AGENTSEOF
```

---

## Step 4: Create `CLAUDE.md`

```bash
cat > CLAUDE.md << 'EOF'
# CLAUDE.md — Project Instructions for Claude Code

> Auto-read by Claude Code CLI. Syncs with `agents.md`.

## Project: <PROJECT_NAME>
**Stack:** <STACK>

## Before Every Session — MANDATORY Read Order
1. `agents.md`
2. `agents/memory-bank/lessons.md`
3. `agents/memory-bank/current-state.md`
4. `agents/memory-bank/module-registry.json`

## Key Rules
- Rapid POC — speed > perfection
- `docs/comprehensive-prd.md` is the PRIMARY deliverable
- Conventional commits with `[trace: ...]`
- Never push directly to main — draft PRs only

## Skills
Location: `.agent/skills/` — read SKILL.md before using any skill.

## After Every Change
1. Update `agents/memory-bank/current-state.md`
2. Update `agents/memory-bank/lessons.md` if you learned something
EOF
```

---

## Step 5: Create `codex-instructions.md`

```bash
cat > codex-instructions.md << 'EOF'
# Codex CLI — Project Instructions

> Context file for Codex CLI. Syncs with `agents.md`.

## Project: <PROJECT_NAME>
**Stack:** <STACK>

## Before Every Session — MANDATORY Read Order
1. `agents.md`
2. `agents/memory-bank/lessons.md`
3. `agents/memory-bank/current-state.md`
4. `agents/memory-bank/module-registry.json`

## Key Rules
- Rapid POC — speed > perfection
- `docs/comprehensive-prd.md` is the PRIMARY deliverable
- Conventional commits with `[trace: ...]`
- Never push directly to main — draft PRs only

## Skills
Location: `.agent/skills/` — read SKILL.md before using any skill.

## After Every Change
1. Update `agents/memory-bank/current-state.md`
2. Update `agents/memory-bank/lessons.md` if you learned something
EOF
```

---

## Step 6: Create Memory Bank

```bash
mkdir -p agents/memory-bank

cat > agents/memory-bank/lessons.md << 'EOF'
# Lessons Learned
> Append-only. Never delete entries.
---
## Session 1 — Initial Setup
- Project initialized with multi-agent config
EOF

cat > agents/memory-bank/decisions.md << 'EOF'
# Architecture & Design Decisions
> Record every significant decision with rationale.
---
EOF

cat > agents/memory-bank/current-state.md << 'EOF'
# Current State
> Updated after each session.
---
### What Is Built
- [x] Agentic environment initialized

### What Is Next
- [ ] Module 1

### Active Module
None — setup phase
EOF

cat > agents/memory-bank/invariants.md << 'EOF'
# Invariants — Never Violate These
---
1. Speed over perfection. Demo-readiness in hours/days.
2. Prototype code is disposable. PRD is permanent.
3. Invoice/data source of truth is computed, not manual.
4. Read order is sacred: agents.md → lessons.md → current-state.md → module-registry.json
5. Every PRD change requires human approval.
6. Every commit uses `[trace: ...]`.
7. All three agents share the same memory bank.
EOF

cat > agents/memory-bank/module-registry.json << 'EOF'
{
  "version": "1.0.0",
  "lastUpdated": "",
  "modules": {}
}
EOF

cat > agents/memory-bank/anti-drift-config.json << 'EOF'
{
  "version": "1.0.0",
  "triggers": {
    "timeIntervalMinutes": 30,
    "tokenThreshold": 5000,
    "toolCallThreshold": 10,
    "onHandoff": true
  },
  "checks": [
    { "id": "memory-bank-consistency", "description": "All memory bank files exist and are current" },
    { "id": "invariant-compliance", "description": "No invariant violations" },
    { "id": "prd-reflects-implementation", "description": "PRD matches implemented modules" },
    { "id": "commit-traceability", "description": "Recent commits have [trace:] tags" },
    { "id": "skills-library-intact", "description": "All skill SKILL.md files are valid" }
  ],
  "onDriftDetected": { "action": "propose-rewind", "requiresHumanConfirmation": true }
}
EOF
```

---

## Step 7: Create Workflows

```bash
mkdir -p .agents/workflows

# Update Living PRD
cat > .agents/workflows/update-living-prd.md << 'EOF'
---
description: Update the living PRD after a module change
---
// turbo-all
1. Read `agents/memory-bank/current-state.md` and `module-registry.json`
2. Update relevant sections in `docs/comprehensive-prd.md`
3. Add changelog entry, trace to discovery, bump version
4. Update `current-state.md`
5. Commit: `docs: update PRD for <module> [trace: <ref>]`
EOF

# Regenerate Full PRD
cat > .agents/workflows/regenerate-full-prd.md << 'EOF'
---
description: Regenerate the full PRD from source documents
---
// turbo-all
1. Read all source documents
2. Read `module-registry.json` for module status
3. Scan codebase for current schema
4. Regenerate every section in `docs/comprehensive-prd.md`
5. Bump version, commit: `docs: regenerate full PRD [trace: full-audit]`
EOF

# Generate Demo Package
cat > .agents/workflows/generate-demo-package.md << 'EOF'
---
description: Generate a demo package for customer review
---
1. Create `docs/demo-instructions.md` with walkthrough steps
2. Capture screenshots of key screens
3. Create `docs/customer-review-script.md`
4. Update PRD Demo Instructions section
5. Commit: `docs: generate demo package [trace: customer-validation]`
EOF

# Finalize Handover
cat > .agents/workflows/finalize-handover.md << 'EOF'
---
description: Finalize handover package for dev team
---
1. Run `/regenerate-full-prd` and `/generate-demo-package`
2. Create `docs/handover-package/` with PRD, demo, discovery docs
3. Add README and prototype-notes
4. Commit: `docs: finalize handover [trace: delivery]`
EOF

# Governance Audit
cat > .agents/workflows/governance-audit.md << 'EOF'
---
description: Run governance audit on memory bank and PRD
---
// turbo-all
1. Verify all memory bank files exist and are current
2. Check invariant compliance
3. Verify PRD matches implementation
4. Check git commits for `[trace:]` tags
5. Verify skills library integrity
6. Report findings and fix issues
7. Commit: `chore: governance audit fixes [trace: governance]`
EOF
```

---

## Step 8: Create PRD Stub

```bash
mkdir -p docs

cat > docs/comprehensive-prd.md << 'EOF'
# <PROJECT_NAME> — Comprehensive PRD

> **Version:** 0.1.0
> **Status:** DRAFT
> **Primary Deliverable** — This document IS the product.

---

## Executive Summary
## Full Requirements
## Data Model
## Features & Flows
## Acceptance Criteria
## Prototype Limitations

> [!CAUTION]
> This code is a rapid POC. Rewrite as needed from the requirements above.

## Demo Instructions
## Traceability Matrix

| Requirement | Source | Quote |
|-------------|--------|-------|

## PRD Changelog

### v0.1.0
- Initial stub
EOF
```

---

## Step 9: Create Core Skills

```bash
# Create the meta skill-creator (use it to generate project-specific skills)
mkdir -p .agent/skills/skill-creator-meta

cat > .agent/skills/skill-creator-meta/SKILL.md << 'EOF'
---
name: skill-creator-meta
description: Meta-skill that generates new skills following the SKILL.md standard
triggers:
  - create skill
  - new skill
version: 1.0.0
---

# Skill Creator (Meta)

## When to Use
When a new repeatable capability is identified.

## Core Instructions
1. Create `.agent/skills/<kebab-case-name>/SKILL.md`
2. Add YAML frontmatter: name, description, triggers, version
3. Write: Overview, When to Use, Core Instructions, Success Criteria
4. Keep body < 400 tokens, single responsibility
5. Commit: `feat(skills): add <name> [trace: <rationale>]`
EOF

# Create the anti-drift-auditor skill
mkdir -p .agent/skills/anti-drift-auditor

cat > .agent/skills/anti-drift-auditor/SKILL.md << 'EOF'
---
name: anti-drift-auditor
description: Run governance checks for drift detection
triggers:
  - anti-drift
  - governance audit
version: 1.0.0
---

# Anti-Drift Auditor

## Core Instructions
1. Verify memory bank files exist and aren't stale
2. Check invariant compliance
3. Verify PRD matches implementation
4. Check commits for `[trace:]` tags
5. Verify skills library integrity
6. If drift found: propose rewind (human confirmation required)
EOF

# Create the reviewer-gate skill
mkdir -p .agent/skills/reviewer-gate

cat > .agent/skills/reviewer-gate/SKILL.md << 'EOF'
---
name: reviewer-gate
description: Standardized review workflow for PRs and PRD changes
triggers:
  - review PR
  - code review
version: 1.0.0
---

# Reviewer Gate

## Core Instructions
1. Code review: stack compliance, [trace:] tags, no hardcoded values
2. PRD review: sections match implementation, traceability, version bumped
3. Module completion: acceptance criteria passing, memory bank updated
4. Flag issues — require fixes before merge
EOF
```

> **Tip:** Use `skill-creator-meta` to generate additional project-specific skills.
> In Antigravity: *"Create new skill xlsx-parser for parsing vendor spreadsheets"*

---

## Step 10: Initial Commit

```bash
git add -A
git commit -m "chore: initialize project with agentic swarm config [trace: setup]"
```

---

## Step 11: Smoke Test

```bash
# Verify everything exists
echo "=== CLI ===" && codex --version && claude --version
echo "=== Git ===" && git log --oneline
echo "=== Skills ===" && ls .agent/skills/
echo "=== Memory ===" && ls agents/memory-bank/
echo "=== Workflows ===" && ls .agents/workflows/

# Test Claude Code (OAuth)
claude --print "Say hello"

# Test Codex (interactive — needs a TTY)
codex "Say hello"
```

Expected output: both respond with "hello" (or similar), no auth errors.

---

## Quick Reference — Directory Structure

```
<project-root>/
├── .gitignore
├── agents.md                          # Master swarm config (Antigravity reads)
├── CLAUDE.md                          # Claude Code auto-reads
├── codex-instructions.md              # Codex context
├── agents/
│   └── memory-bank/
│       ├── lessons.md
│       ├── decisions.md
│       ├── current-state.md
│       ├── invariants.md
│       ├── module-registry.json
│       └── anti-drift-config.json
├── .agent/
│   └── skills/
│       ├── skill-creator-meta/SKILL.md
│       ├── anti-drift-auditor/SKILL.md
│       ├── reviewer-gate/SKILL.md
│       └── <project-specific-skills>/SKILL.md
├── .agents/
│   └── workflows/
│       ├── update-living-prd.md
│       ├── regenerate-full-prd.md
│       ├── generate-demo-package.md
│       ├── finalize-handover.md
│       └── governance-audit.md
└── docs/
    └── comprehensive-prd.md           # PRIMARY DELIVERABLE
```

---

## Adding Project-Specific Skills

After initial setup, tell any agent to create project-specific skills:

```
Create new skill xlsx-vendor-parser for parsing vendor invoice spreadsheets
Create new skill api-client for calling the external billing API
```

The `skill-creator-meta` skill handles the rest.

---

## Daily Commands

```
/update-living-prd <module>
/regenerate-full-prd
/generate-demo-package
/finalize-handover
/governance-audit
```

In Codex: `codex --full-auto "Run governance audit on this project"`
In Claude: `claude -p "Run /governance-audit" --dangerously-skip-permissions`

---

## Orchestration Dispatch — Running Workers in Background

> **Problem:** When an orchestrator agent (e.g. Antigravity/Gemini) dispatches Claude Code
> or Codex via `run_command`, background processes receive SIGINT and die.
>
> **Solution:** Use `screen -dmS` for process isolation.

### Dispatching Claude Code

```bash
# --dangerously-skip-permissions allows autonomous file writes
screen -dmS claude-worker bash -c '
  cd /path/to/project && \
  claude -p "<detailed task prompt>" --dangerously-skip-permissions \
  > /tmp/claude-worker.log 2>&1
'
```

**Key flags:**
- `-p "..."` — pipe mode (non-interactive, prompt as argument)
- `--dangerously-skip-permissions` — allows file read/write/execute without approval

### Dispatching Codex

```bash
# Codex requires a TTY — use `script` to fake one inside screen
screen -dmS codex-worker bash -c '
  cd /path/to/project && \
  script -q /tmp/codex-worker.log \
  command codex --full-auto "<detailed task prompt>"
'
```

**Key flags:**
- `--full-auto` — reads, writes, and executes without approval
- `script -q` — provides the pseudo-TTY that Codex requires

### Monitoring Workers

```bash
# List active screen sessions
screen -ls

# Check worker output
tail -f /tmp/claude-worker.log
tail -f /tmp/codex-worker.log

# Attach to a session (for debugging)
screen -r claude-worker

# Check if files were created
ls -la <expected-output-files>
```

### Orchestration Tips

1. **One task per worker** — give each worker a single, self-contained task
2. **Reference existing code** — tell workers to read specific files for patterns
   (e.g. "match the pattern in `server/routers/gutcheck.ts`")
3. **Workers share the filesystem** — coordinate to avoid write conflicts
4. **Log everything** — redirect all output to `/tmp/<name>.log` for debugging
5. **Use unique screen names** — `screen -dmS claude-export`, `screen -dmS codex-docker`, etc.
6. **Clean up** — `screen -S <name> -X quit` after verifying output
