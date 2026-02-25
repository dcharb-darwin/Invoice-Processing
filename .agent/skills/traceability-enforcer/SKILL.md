---
name: traceability-enforcer
description: Ensure all commits, PRD entries, and code comments trace back to discovery document requirements
triggers:
  - trace
  - commit message
  - traceability
version: 1.0.0
---

# Traceability Enforcer

## Overview
Enforces that every change traces back to a discovery requirement. Validates commit messages have `[trace:]` tags and PRD entries link to `00-discovery-extraction.md` quotes.

## When to Use
- Before every commit (pre-commit check)
- During AntiDrift audits
- When updating the PRD Traceability Matrix

## Core Instructions
1. **Commit messages:** Verify format `<type>(<scope>): <description> [trace: <ref>]`
   - `<ref>` can be: discovery line number, quote keyword, or section name
   - Example: `feat(schema): add contracts table [trace: discovery L89-93]`
2. **PRD entries:** Every requirement in the PRD must have a corresponding row in the Traceability Matrix with:
   - Source document and line/section reference
   - Direct quote from discovery
3. **Code comments:** Key business logic should have `// [trace: ...]` comments linking to discovery rationale
4. Flag any untraced commits or PRD entries

## Success Criteria
- 100% of commits have `[trace:]` tags
- PRD Traceability Matrix has entries for all implemented features
- No orphaned requirements (requirements without discovery backing)
