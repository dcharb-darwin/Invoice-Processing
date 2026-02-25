---
name: gutcheck-engine
description: Compute and flag budget health alerts — percent spent vs percent scope complete, budget thresholds, contract overruns
triggers:
  - gut check
  - budget alert
  - health check
  - percent spent
version: 1.0.0
---

# Gut-Check Engine

## Overview
Automates Shannon's manual "does this feel right?" budget review. Compares percent spent against percent scope complete for every budget line item and flags mismatches visually.

## When to Use
- Computing budget health indicators for display
- After invoice entry or import
- Dashboard rendering
- AntiDrift audit of financial data

## Core Instructions
1. For each `budgetLineItem`:
   - Compute `percentSpent = paidToDate / projectedCost`
   - Compare against `percentScopeComplete`
   - Flag if `percentSpent > percentScopeComplete + 0.15` (yellow) or `+ 0.30` (red)
2. For each `project`:
   - `totalSpent = sum(budgetLineItems.paidToDate)`
   - `totalBudget = sum(fundingSources.allocatedAmount)`
   - Flag if `totalSpent > totalBudget * 0.85` (yellow) or `* 0.95` (red)
3. For each `contract`:
   - `cumulativeInvoices = sum(related invoices.totalAmount)`
   - `contractTotal = originalAmount + sum(supplements.amount)`
   - Flag if `cumulativeInvoices > contractTotal`
4. Return severity: `green | yellow | red` for each entity
5. Source: `01-development-plan.md` lines 159-177

## Success Criteria
- Green/yellow/red indicators render on every budget line item
- Over-budget contracts flagged immediately
- Thresholds configurable in future (hardcoded for POC)
