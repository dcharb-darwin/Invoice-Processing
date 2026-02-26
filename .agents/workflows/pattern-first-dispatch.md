---
description: Enforced workflow for any feature change, bug fix, or design pattern implementation. Prevents tactical line-editing without PRD context and pattern thinking.
---

# Pattern-First Dispatch Workflow

**When to use:** EVERY time you are about to modify application code (components, routers, schema, seed, styles). This is NOT optional.

**Anti-pattern this prevents:** Agent receives request → immediately starts editing component files → hardcodes for specific data → user frustrated because it's not a reusable pattern.

---

## Step 1: STOP — Is this a pattern or a one-off?

Before touching ANY code, answer these questions in your planning artifact:

1. **What is the general design pattern?** (not "add 📄 link to DEA-599518" but "every record with a source document shows a provenance indicator everywhere it renders")
2. **Does this pattern already exist in `agents.md §4`?** If yes, you're implementing an existing pattern. If no, define the new pattern first.
3. **What entities does this affect?** List every entity type and every page/surface where they render.
4. **Would this work for a project/vendor/PM we haven't seen yet?** If no, rethink.

## Step 2: Update PRD FIRST

// turbo
1. Read `docs/comprehensive-prd.md`
2. Add or update the relevant section describing the pattern as a **system-wide behavior**, not a per-component fix
3. Include: affected entities, expected UI behavior, edge cases (e.g., "what if no source doc exists?")

## Step 3: Update `agents.md` if new pattern

If this is a NEW architectural pattern (not already in §4):
1. Add it to `agents.md §4 RAPID POC INVARIANTS`
2. Write it as a rule that any future agent must follow
3. Include the "ask yourself" test question

## Step 4: Design the implementation as shared infrastructure

Think in layers, not pages:
- **Shared utility/helper** (e.g., `sourceLabels.ts`) — one place, all pages consume
- **Schema field** if needed — add to Drizzle schema, not hardcode in component
- **API change** if needed — update router to include relation/field
- **Component pattern** — define ONCE how the pattern renders, then apply consistently

## Step 5: Dispatch with cross-cutting context

Use the dispatch template from `agents.md §4.5`:

```
"Read CLAUDE.md AND docs/comprehensive-prd.md first for full architecture and design context.

SYSTEM CONTEXT: [How this feature relates to other pages/components]
DESIGN PRINCIPLE: [The architectural pattern from agents.md §4]
CROSS-CUTTING: [Which pages/surfaces are affected and must be consistent]
TASK: [Specific implementation — shared helper first, then apply to all surfaces]"
```

## Step 6: Verify pattern consistency

After implementation, verify:
- [ ] The pattern works on ALL affected pages (not just the one that triggered the request)
- [ ] A new project with no source data renders correctly (no broken links, honest labels)
- [ ] A new project WITH source data renders correctly
- [ ] TypeScript compiles (`npx tsc --noEmit`)

## Step 7: Commit with pattern trace

Commit message must reference the pattern:
```
feat(<pattern-name>): <what changed>

[trace: agents.md §4 — <pattern name>]
```

---

## Red Flags — STOP and re-read this workflow if you catch yourself:

- Opening a component file before opening the PRD
- Writing `if (projectId === 2)` or any data-specific conditional
- Editing more than 3 component files without a shared helper
- Copying the same JSX pattern into multiple files instead of extracting it
- Using `sed` to batch-edit HTML files instead of solving the root cause
- Spending more than 5 minutes on a single file without checking cross-cutting impact
