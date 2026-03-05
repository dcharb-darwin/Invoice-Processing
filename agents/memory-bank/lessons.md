# Lessons Learned

> Accumulated learnings across agent sessions. Append-only — never delete entries.

---

## Session 1 — Initial Setup (2026-02-25)

- **Environment:** macOS, Node v25.6.0, npm 11.8.0
- **Workspace:** `/Users/dcharb/Documents/DarwinDashboards/LakeStevens.agentic.antigravity`
- **Stack confirmed:** React 19 / Express / tRPC / Drizzle / SQLite
- Large binary files (.mp3, .pptx, .docx, .pdf) are gitignored — they live on SharePoint
- Discovery docs are markdown/text files and ARE tracked in git

## Session 2 — V1 Build + Orchestration (2026-02-25)

### Drizzle ORM
- Drizzle v0.45+ returns Promises even for synchronous SQLite — **always use `await`** on `.insert().returning()`, `.run()`, etc.
- Destructuring without await causes `TypeError: object is not iterable` — this bit us in both `seed.ts` and `projects.ts`
- Must ensure `data/` directory exists before opening SQLite DB

### Orchestration (CRITICAL)
- **Antigravity = orchestrator, Claude Code + Codex = workers** — per `agents.md` L38-41
- Direct `run_command` backgrounding (`&`) causes SIGINT (exit 130) — processes get killed
- **Working pattern:** `screen -dmS <name> bash -c '...'` for process isolation
- Claude Code flags: `-p "prompt" --dangerously-skip-permissions` for autonomous file writes
- Codex flags: `--full-auto "prompt"` — also requires TTY, use `script -q` inside screen
- Both workers completed successfully once screen was used: Claude Code built `export.ts`, Codex built Docker files
- Workers share filesystem — coordinate to avoid write conflicts

### Design
- TaskLine uses light-mode-first design: slate-50 bg, white cards, blue-600 accent, Inter font, shadow-sm
- Invoice app should match TaskLine visually — separate apps, shared visual language
- Dark mode is an option (not default) — toggle in header
- CSS custom properties (design tokens) work well with Tailwind for theme support

### Anti-Drift
- Memory bank went stale mid-session — `current-state.md` was stuck at Module 1 while we built Modules 2-3
- Must update memory bank files after each module completion (governance requirement)
- Anti-drift audit is overdue (should trigger every 30 min / 10 tool calls)

### Skills Usage
- `gutcheck-engine` — implemented in `server/routers/gutcheck.ts` (thresholds: BLI +15%/+30%, project 85%/95%)
- `budget-auto-generator` — implemented in `server/routers/contracts.ts` (auto-generates line items from contract type)
- Both skills referenced in SKILL.md, logic translated to tRPC procedures

## Session 3 — Legacy Cleanup + UI/UX Consistency (2026-03-05)

- PRD metadata can drift from changelog/history; keep `docs/comprehensive-prd.md` header version/date synchronized with latest changelog entry.
- Migration chain references in governance artifacts can become stale even when build succeeds; reconcile `module-registry.json` to the active migration tag in `server/db/migrations/meta/_journal.json`.
- Shared UI primitives (status badge, modal shell, route helper, source/entity links) reduce multi-page drift quickly and are safer than large visual rewrites for parity-focused cleanup.
- `scripts/generate-demo-docs.ts` should be exposed via npm scripts to avoid utility ownership ambiguity.
- PRD section naming in governance metadata should match exact heading titles (`Import/Export Specification`) to keep anti-drift checks deterministic.
- Reviewer/anti-drift checks should explicitly call out historical commits without `[trace:]` tags as a pre-merge governance risk.
