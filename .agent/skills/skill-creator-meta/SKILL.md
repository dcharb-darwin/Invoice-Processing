---
name: skill-creator-meta
description: Meta-skill that generates new skills on demand following the 2026 SKILL.md standard
triggers:
  - create skill
  - new skill
  - skill-creator
version: 1.0.0
---

# Skill Creator (Meta)

## Overview
A meta-skill that creates new skills following the project's SKILL.md standard. Ensures every new skill has proper YAML frontmatter, concise body (<400 tokens), and follows single-responsibility principle.

## When to Use
- When a new repeatable capability is identified
- When `Create new skill <name>` command is used
- When a workflow should be formalized as a reusable skill

## Core Instructions
1. Create skill directory: `.agent/skills/<kebab-case-name>/`
2. Create `SKILL.md` with:
   ```yaml
   ---
   name: <kebab-case-name>
   description: <one-line description>
   triggers:
     - <keyword 1>
     - <keyword 2>
   version: 1.0.0
   ---
   ```
3. Write body sections: Overview, When to Use, Core Instructions, Success Criteria
4. Keep body under 400 tokens
5. Create `scripts/` directory only if deterministic automation is needed
6. Add to `agents/memory-bank/module-registry.json` skills section if applicable
7. Commit: `feat(skills): add <name> skill [trace: <rationale>]`

## Success Criteria
- New skill has valid YAML frontmatter
- Body is under 400 tokens
- Triggers are relevant and specific
- Skill follows single-responsibility principle
