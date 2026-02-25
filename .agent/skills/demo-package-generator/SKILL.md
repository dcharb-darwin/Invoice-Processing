---
name: demo-package-generator
description: Generate demo screenshots, instructions, customer review script, and handover zip for customer presentations
triggers:
  - demo package
  - generate demo
  - customer review
  - handover
version: 1.0.0
---

# Demo Package Generator

## Overview
Creates a complete demo package for presenting the prototype to Eric, Shannon, and the Lake Stevens team. Includes step-by-step instructions, screenshots, and a customer review script.

## When to Use
- After V1 is demo-ready (Day 3)
- After V2 is demo-ready (Day 5)
- When `/generate-demo-package` is invoked

## Core Instructions
1. Create `docs/demo-instructions.md` with startup steps and feature walkthrough
2. Capture screenshots of key screens using browser tools
3. Create `docs/customer-review-script.md` with questions for Eric and Shannon
4. Highlight Eric's Main Street (18013) data and Shannon's 36th St Bridge data
5. Include talking points: "Here's YOUR data, imported from YOUR spreadsheets"
6. Update PRD Demo Instructions section

## Success Criteria
- Demo instructions cover every V1 feature
- Screenshots exist for all key screens
- Customer review script has specific validation questions
