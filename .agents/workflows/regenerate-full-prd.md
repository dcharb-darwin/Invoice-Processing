---
description: Regenerate the full PRD from source documents
---

# /regenerate-full-prd

Complete regeneration of `docs/comprehensive-prd.md` from source documents and current codebase.

## Steps

// turbo-all

1. Read all source documents:
   - `00-discovery-extraction.md`
   - `01-development-plan.md`
   - `discovery-session-transcript.txt`
   - `02-taskline-gen2-suggestions.md`

2. Read `agents/memory-bank/module-registry.json` to see module status.

3. Scan the codebase for the current Drizzle schema (if exists) to generate accurate data model docs.

4. Regenerate every section in `docs/comprehensive-prd.md`:
   - Executive Summary (from discovery)
   - Full Requirements (traced to discovery quotes)
   - Data Model + diagrams (from Drizzle schema or plan)
   - Features & Flows (from dev plan + implemented code)
   - Acceptance Criteria (from dev plan, checked against tests)
   - Gut-Check Engine (from dev plan Section: The Gut-Check Engine)
   - Import/Export Standard (from dev plan Section: Import/Export)
   - Things You Didn't Think Of (from dev plan Section: Things You Didn't Think Of)
   - Prototype Limitations
   - Demo Instructions + Customer Review Script
   - Traceability Matrix (every requirement → discovery quote)
   - PRD Changelog (preserve existing log, add regeneration entry)

5. Bump PRD version and add changelog entry.

6. Commit: `docs: regenerate full PRD [trace: full-audit]`
