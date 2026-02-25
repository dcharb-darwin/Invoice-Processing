# Invariants — Never Violate These

> Checked at every session start and before every PR merge. If any invariant is violated, STOP and fix before proceeding.

---

## Rapid POC Rules

1. **Speed over perfection.** Build for demo-readiness in hours/days, not weeks.
2. **Seed with real data.** Eric 18013 + Shannon 36th St Bridge — always. The demo must show THEIR projects.
3. **Semi-functional means:** clickable flows, computed gut-checks, import/export working.
4. **Prototype code is disposable.** The PRD (`docs/comprehensive-prd.md`) is permanent.
5. **Never spend more than 30 minutes** on a single component before showing progress.
6. **If blocked, skip and return.** Demo momentum is everything.

## Architecture Rules

7. **Same stack as TaskLine gen2.** React 19 / Express / tRPC / Drizzle / SQLite. No divergence.
8. **Invoice task breakdown IS the source of truth** for budget line item totals. Never build manual "update budget totals."
9. **Contract supplements are discrete records**, not edits to a number.
10. **ROW parcels are their own thing** — separate table, separate UI.
11. **Integrate, don't replace.** SharePoint = documents, Springbrook = finance, Adobe Sign = signatures.

## Governance Rules

12. **Read order is sacred:** agents.md → lessons.md → current-state.md → module-registry.json
13. **Every PRD change requires human approval** before merge.
14. **Every commit uses conventional format** with `[trace: ...]` linking to discovery.
15. **ReviewerAgent is mandatory** — no PR merges without review.
16. **All three agents (Antigravity, Claude Code, Codex)** share the same memory bank.
