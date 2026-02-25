---
name: xlsx-shannon-parser
description: Parse Shannon's BTR Expense Tracking Worksheet formats (simple and detailed 32-column versions) into the standard data model
triggers:
  - import xlsx
  - Shannon BTR
  - parse spreadsheet
version: 1.0.0
---

# XLSX Shannon Parser

## Overview
Parses Shannon's BTR Expense Tracking Worksheet `.xlsx` files into the Invoice Processing Coordinator data model. Handles both the simple (high-level task) and detailed (32-column breakdown) versions.

## When to Use
- Importing Shannon's existing project spreadsheets
- Re-importing updated spreadsheets for bidirectional sync
- Testing import with `BTR Expense Tracking Worksheet_36th St Bridge.xlsx`

## Core Instructions
1. Read the `.xlsx` using SheetJS (`xlsx` npm package)
2. Detect format: check column count — simple (<10 task columns) vs detailed (32 columns)
3. Map sheets:
   - **Budget Worksheet** → `projects`, `fundingSources`, `budgetLineItems`
   - **DEa tab** → `contracts` (Design type), `invoiceTaskBreakdown`
   - **Breakdown by task** → `invoiceTaskBreakdown` detail
   - **Loan Reimbursements** → `fundingSources` with grant info
4. Extract funding sources: source name, year allocations (2025, 2026, total)
5. Map budget line items: Design, Inspector/Material, Permitting, Misc → `budgetLineItems.category`
6. For invoices: merge by `invoiceNumber` on re-import

## Success Criteria
- Shannon's 36th St Bridge data imports without errors
- Budget totals in app match spreadsheet totals
- Re-import updates existing records, doesn't duplicate
