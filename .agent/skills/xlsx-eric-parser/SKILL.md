---
name: xlsx-eric-parser
description: Parse Eric's 18013_Budget style capital project spreadsheets with multi-tab structure (Overview, Design, ROW, CM, Construction)
triggers:
  - import xlsx
  - Eric budget
  - 18013 parse
version: 1.0.0
---

# XLSX Eric Parser

## Overview
Parses Eric's capital project budget spreadsheets (e.g., `18013_Budget.xlsx`) into the standard data model. These are more comprehensive than Shannon's, with multiple tabs per contract type.

## When to Use
- Importing Eric's existing project spreadsheets
- Re-importing for bidirectional sync
- Testing import with `18013_Budget.xlsx` (Main Street Improvements)

## Core Instructions
1. Read the `.xlsx` using SheetJS
2. Map tabs to data model:
   - **Overview** → `projects` (name, CFP #, project #), `fundingSources` (budget codes, amounts)
   - **Design tab** → `contracts` (Design type), `invoices`, `invoiceTaskBreakdown`
   - **ROW tab** → `rowParcels` (parcel numbers, expenditure types)
   - **CM Services tab** → `contracts` (CM_Services type), `invoices`
   - **Construction tab** → `contracts` (Construction type)
3. Extract contract details: original amount, supplement amounts, signed doc links
4. Extract invoice logs: invoice #, amounts, running totals
5. Parse Springbrook budget codes as display-only text
6. Extract council authorization dates and milestone dates
7. Preserve hyperlinks to SharePoint contract documents as `signedDocumentLink`

## Success Criteria
- Eric's Main Street (18013) imports with all 3 contract types
- Contract supplements imported as discrete records
- ROW parcels imported separately from invoices
- Budget codes display correctly (not used for computation)
