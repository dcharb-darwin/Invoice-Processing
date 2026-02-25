---
name: budget-auto-generator
description: Auto-generate budget line items from contract type when a new contract is created
triggers:
  - new contract
  - budget generation
  - contract created
version: 1.0.0
---

# Budget Auto-Generator

## Overview
When a contract is created for a project, automatically generates the corresponding budget line items based on contract type. This eliminates manual budget structure setup.

## When to Use
- New contract added to a project
- Resetting budget structure after contract type change
- Seeding demo data

## Core Instructions
1. On contract creation, generate budget line items per this mapping:

   | Contract Type | Budget Line Items |
   |---|---|
   | Design | Design, Permitting (optional) |
   | CM Services | CM_Services, Inspector_Material (optional) |
   | Construction | Construction, Misc (optional) |

2. Set `projectedCost` to 0 initially (PM fills in manually or from import)
3. Set `percentScopeComplete` to 0
4. Mark optional items with a flag — PM can remove if not needed
5. Never delete existing budget line items when adding a new contract
6. Source: `01-development-plan.md` lines 146-157

## Success Criteria
- Creating a Design contract generates Design + Permitting line items
- Creating all 3 contract types for one project generates full budget structure
- PM can remove optional items after generation
- Existing line items preserved when adding additional contracts
