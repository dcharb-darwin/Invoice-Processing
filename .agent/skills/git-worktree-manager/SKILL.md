---
name: git-worktree-manager
description: Create and prune git worktrees for module isolation, with draft PR creation
triggers:
  - worktree
  - new module branch
  - draft PR
version: 1.0.0
---

# Git Worktree Manager

## Overview
Manages git worktrees for module-level isolation. Each module gets its own worktree branched from main, with a draft PR created on push.

## When to Use
- Starting a new module
- Creating isolated branch for a feature
- Cleaning up after module merge

## Core Instructions
1. **Create worktree:**
   ```bash
   git worktree add ../LakeStevens-<module-name> -b module/<module-name>
   ```
2. **Work in worktree:** All module changes happen in the worktree directory
3. **Commit with traceability:**
   ```bash
   git commit -m "<type>(<scope>): <description> [trace: <discovery-ref>]"
   ```
4. **Push and create draft PR** (when GitHub remote is configured):
   ```bash
   git push -u origin module/<module-name>
   gh pr create --draft --title "Module: <name>" --body "PRD sections: ..."
   ```
5. **After merge, prune:**
   ```bash
   git worktree remove ../LakeStevens-<module-name>
   git branch -d module/<module-name>
   ```

## Success Criteria
- Each module has its own isolated worktree
- No cross-module contamination
- Draft PR exists before any review
- Worktree pruned after successful merge
