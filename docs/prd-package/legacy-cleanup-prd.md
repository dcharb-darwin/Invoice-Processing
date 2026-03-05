# Legacy Cleanup Program — PRD

> [!NOTE]
> PRD-first cleanup plan for tracked application and documentation artifacts. This defines the cleanup contract before implementation.

---

## 1. Scope and Intent

This cleanup effort standardizes repository state for maintainability and governance without changing product behavior.

In scope:
- Tracked app/runtime files (`src/`, `server/`, `scripts/`, `docs/`, `agents/memory-bank/`)
- Migration metadata and governance metadata drift
- Orphaned utilities and undocumented script ownership

Out of scope:
- Non-tracked local folders (`archive/`, external snapshots, local machine artifacts)
- Rebranding or redesign work

---

## 2. Cleanup Policy

### 2.1 File Inventory Matrix

| Path / Area | Action | Rationale |
|---|---|---|
| `server/db/migrations/*` + `server/db/migrations/meta/*` | `refactor` | Reconcile to one valid baseline chain and update references |
| `agents/memory-bank/current-state.md` | `refactor` | Timestamp and status drift from current implementation |
| `agents/memory-bank/module-registry.json` | `refactor` | References removed migration names and stale module metadata |
| `docs/comprehensive-prd.md` metadata/changelog headers | `refactor` | Header version/date drift with changelog entries |
| `scripts/generate-demo-docs.ts` | `keep` + `wire` | Retain utility and expose explicit npm script ownership |
| duplicated in-page UI primitives in `src/pages/*` | `refactor` | Centralize into shared components to reduce drift |
| tracked files with no usage and no PRD linkage (future candidates) | `archive` | Move to `archive/` only when explicit non-runtime and non-referenced |

### 2.2 Keep / Delete Rules

A tracked file may be deleted only if all conditions are true:
1. No imports/usages in runtime code (`rg` confirms).
2. No PRD, README, or workflow reference.
3. Replacement exists or behavior is intentionally removed and documented.
4. Build + migration checks remain green.

---

## 3. Migration Baseline Policy

### 3.1 Single Baseline Standard

The migration system must point to exactly one coherent baseline chain:
- SQL migration file tag in `_journal.json`
- matching snapshot file in `meta/`
- module registry references consistent with actual files

### 3.2 Validation Requirements

Required checks after migration cleanup:
1. `npm run db:reset` succeeds.
2. `npm run build` succeeds.
3. `_journal.json` tag equals existing migration filename stem.
4. `module-registry.json` migration list references existing files only.

---

## 4. Governance Synchronization Requirements

The following files must stay synchronized after every cleanup module change:
- `docs/comprehensive-prd.md` (header version/date and changelog entries)
- `agents/memory-bank/current-state.md`
- `agents/memory-bank/module-registry.json`
- `agents/memory-bank/lessons.md` (append findings)

### 4.1 Anti-Drift Gate

Before merge, anti-drift audit must confirm:
- no stale migration references
- PRD metadata coherence
- memory-bank status coherence
- skills inventory integrity

---

## 5. Acceptance Criteria

1. No stale migration references in memory-bank or codebase.
2. PRD header/version/date are coherent with changelog.
3. `scripts/generate-demo-docs.ts` has explicit invocation path and ownership.
4. No duplicate shared UI primitive definitions for status badge and modal shell.
5. `npm run db:reset` and `npm run build` both pass.
6. Reviewer gate marks cleanup module as passing.

---

## 6. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Migration cleanup breaks local seed flow | High | Validate with full `db:reset` and baseline sample data load |
| Cleanup accidentally removes referenced file | High | Enforce keep/delete rules with reference scan |
| Governance docs drift again | Medium | Add explicit checklist and anti-drift pre-merge gate |

---

## 7. Traceability

- Standardization pressure: `docs/discovery/00-discovery-extraction.md` (Eric standards quote)
- Integration-not-replacement rule: `docs/discovery/00-discovery-extraction.md` (system coexistence)
- PRD-first workflow: `.agents/workflows/pattern-first-dispatch.md`
