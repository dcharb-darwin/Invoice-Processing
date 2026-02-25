---
description: Update the living PRD after a module change
---

# /update-living-prd <module>

Update `docs/comprehensive-prd.md` to reflect changes made in the specified module.

## Steps

// turbo-all

1. Read `agents/memory-bank/current-state.md` to understand what was just built.

2. Read `agents/memory-bank/module-registry.json` to see which PRD sections this module owns.

3. Read the current `docs/comprehensive-prd.md`.

4. For the module's owned PRD sections, update them based on what was actually implemented:
   - **Data Model**: Update schema diagrams and field descriptions
   - **Features & Flows**: Update user flows and feature descriptions
   - **Acceptance Criteria**: Check off any criteria that are now passing
   - **Gut-Check Engine**: Update rules and thresholds if changed
   - **Import/Export**: Update supported formats and mapping details

5. Add an entry to the PRD Changelog section:
   ```
   ## vX.Y.Z — <date>
   - <module>: <what changed>
   ```

6. Trace every new requirement back to a quote in `00-discovery-extraction.md` (add to Traceability Matrix).

7. Update `agents/memory-bank/current-state.md` to reflect the PRD update.

8. Commit with: `docs: update PRD for <module> [trace: <discovery-ref>]`
