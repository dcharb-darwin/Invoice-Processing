---
name: drizzle-schema-generator
description: Create Drizzle ORM schema and migrations from the discovery data model specification
triggers:
  - schema
  - drizzle
  - data model
  - migration
version: 1.0.0
---

# Drizzle Schema Generator

## Overview
Generates the Drizzle ORM schema for SQLite matching the data model in `01-development-plan.md`. Creates type-safe table definitions, relations, and migration files.

## When to Use
- Module 1: Data Foundation — initial schema creation
- Adding new tables or columns
- Generating migration files after schema changes

## Core Instructions
1. Reference the schema from `01-development-plan.md` lines 81-135
2. Create Drizzle table definitions in `src/db/schema.ts`:
   - `projects`, `contracts`, `contractSupplements`, `fundingSources`
   - `budgetLineItems`, `invoices`, `invoiceTaskBreakdown`, `rowParcels`
3. Use Drizzle conventions: `sqliteTable()`, proper column types
4. Define enums as union types (not DB enums — SQLite doesn't support them):
   - Project type: `ST | PA | FA | SW`
   - Contract type: `Design | CM_Services | Construction`
   - Invoice status: `Received | Logged | Reviewed | Signed | Paid`
   - Budget category: `Design | ROW | CM_Services | Construction | Inspector_Material | Permitting | Misc`
5. Add indexes on: `invoiceNumber`, `cfpNumber`, `projectNumber`
6. Use `drizzle-kit` for migrations

## Success Criteria
- Schema matches discovery data model exactly
- All relations defined (project→contracts→invoices→breakdowns)
- Migrations run cleanly on fresh SQLite DB
- TypeScript types exported for use in tRPC routers
