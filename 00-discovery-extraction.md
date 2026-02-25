# Capital Projects Workflow — Discovery Extraction

> Raw ideas, concepts, relationships, and quotes pulled from the discovery session transcript, summary, mindmap, action items, spreadsheets, and supporting documents. This is the foundation layer — everything downstream (architecture, plan, backlog) should trace back to something here.

---

## Participants & Roles

| Who | Role | Focus Area |
|-----|------|------------|
| **Eric** (Speaker 3) | Capital Projects Manager | Manages ~14 capital projects spanning design and construction. Most comprehensive spreadsheets. Wants standardization and organizational accountability. |
| **Shannon** (Speaker 2) | Project Coordinator | Manages ~7 capital projects, primarily design-phase focused. Spreadsheets vary from high-level to very detailed depending on project. |
| **Lori** | Administrative/Coordination | Document logistics, SharePoint organization, file sharing. Will be the one uploading/sending documents. |
| **Daniel** (Speaker 1) | Ngentic AI / Darwin / Launchpad consultant | Leading the discovery session, building the solution. |
| **IT Director** | IT Department (not present) | Identified as future stakeholder for SharePoint API integration. |
| **Finance Team** | Finance Department (not present) | Track post-payment data via Springbrook. Not yet engaged as stakeholder. |

---

## Current State — How Things Work Today

### Invoice Processing Workflow (the 80-90% case)

1. Consultant sends invoice to **Finance department via email**
2. Finance places invoice in a designated **SharePoint folder** (e.g., "Shannon needs to find it")
3. **Email notification** fires — PM knows an invoice arrived
4. PM opens the invoice PDF, reviews it
5. PM navigates to their **individual project tracking spreadsheet** (stored in capital project folder, accessed via hotlinks)
6. PM manually logs invoice data into spreadsheet **by task** (project management, surveying, etc.)
7. PM calculates: amount spent, amount remaining, percent complete
8. PM performs **"gut check"** — compares percent spent vs. project progress (e.g., "13% complete — does that sound right?")
9. PM flags issues like budget overruns before design milestones (e.g., "spent almost all budget, don't even have 30% design yet")
10. PM cross-references invoice total against spreadsheet entry for accuracy
11. Signed invoice moved to **"approved" folder** or routed to secondary signer
12. Signature performed via **Adobe electronic signature**

> **Shannon quote:** "90% of the time this is the standard process; variations occur only in spreadsheet detail level"

### Grant Reimbursement (extension of invoice workflow)

1. PM tracks which grant each invoice is coded to in the spreadsheet
2. PM marks which invoices were included in each reimbursement submission
3. To build a reimbursement package, PM goes to **SharePoint invoice folders**, searches for specific invoice numbers
4. PM cross-references invoice numbers against grant-specific folders
5. PM assembles reimbursement package manually

> **Shannon:** "I have invoice numbers here. And also, when I go to code this, I will put which grant it's for."

### Finance Team's Parallel Process

- Finance tracks **post-payment** data through **Springbrook** (ERP/financial software)
- Each capital project has budget codes tied to Springbrook account numbers
- Finance maintains a **separate master tracker** hyperlinked to Springbrook data
- Finance tracker shows: budget code, how much allocated, how much spent, contractor names, contract amounts, amounts remaining
- This creates **duplicate work** — PM tracks pre-payment, Finance tracks post-payment, no reconciliation mechanism

> **Eric:** "I was storing all of my information. But then I'm duplicate of the work that she's doing. But I want to have a more real time access. I don't really care what we paid... I'm more worried about what we're spending out of."

> **Eric's analogy:** "Our version is the debit card view. Their version is the check-cleared, bank account view. There's always a delta because we've got invoices I've already removed the money for, but they haven't necessarily paid yet."

---

## Current State — Tracking Spreadsheets & Data Architecture

### The Standardization Problem

- Each PM maintains **individual tracking spreadsheets** — no standardization across team
- At least **3 different formats** in active use across only a handful of project managers
- Shannon's spreadsheets vary by project — from high-level to very detailed
- Eric's are the most comprehensive — but even his are a single format
- The team **wants** to standardize but hasn't had time

> **Eric:** "Our biggest need right now is just the organization and creating standards for what everyone's doing and making sure that everyone does it the same way."

> **Shannon:** "I think we could easily standardize whatever we need to. Just our challenge is just like having the time to go and standardize it."

> **Shannon:** "I have things that differ... I'll look at them different just based on what the project is and who the consultant is. It would be nice if we just standardized it."

> **Eric:** "Even if we have three different standards, at least then it's only three."

### Shannon's Spreadsheets (BTR Expense Tracking)

**Simple version** — high-level task tracking:
- Project funding by year (source, 2025, 2026, total)
- Working expense budget: line items for Design, Inspector/Material, Permitting, Misc
- Columns: projected expense, paid to date, balance remaining, % spent, % scope complete
- Cross-sheet formulas pulling from Design detail tab

**Detailed version** (what Shannon said is "a better representation of what we are looking for"):
- Same budget structure but with 32-column task breakdown
- Individual task-level expense allocation
- More granular vendor/phase tracking

**Both versions contain:**
- Budget Worksheet (main view)
- DEa tab (design expense details)
- Breakdown by task tab
- Loan Reimbursements tab

### Eric's Spreadsheets

**Project-level tracker (18013_Budget.xlsx — Main Street Improvements):**
- Overview sheet: project name, RD-101, CFP #18013
- Budget sources with **Springbrook budget codes** (e.g., 301-000-333-20-20-50)
- Multiple funding sources (FHWA Grant, TIZ 1, R2 Main)
- Cross-sheet formulas linking Design, ROW, CM Services, Construction tabs
- **Hyperlinks to signed contracts** in SharePoint
- Contract tracking: original amount + supplements = cumulative total
- Invoice log with invoice numbers, amounts, running totals
- Right-of-way tracking (parcel numbers, expenditures)
- Construction management services tracking (separate consultant)
- Council authorization dates (manually entered)
- Key milestone dates (manually entered)

> **Eric:** "The links lead to the contract... that's the actual signed contract. We had a supplementary contract here. Supplement one. Here's supplement two. All the signed. Link directly to the signed. Which lives in SharePoint."

**Finance team spreadsheet (2025 Capital Project Tracker):**
- Master list of every budgeted capital project
- Each project hyperlinked to a more rudimentary version of project-level tracking
- Tracks post-payment data from Springbrook (actual check issuance)
- Includes budget codes, budget account numbers, fund descriptions
- Contract names, contract budgets, spent, remaining amounts
- Budget reference tab referencing Springbrook account numbers

**Master annual budget plan:**
- Exists in Excel on SharePoint
- Contains all budget sources per capital project with allocated amounts

**Capital Gantt (2025 Capital Gantt.xlsx):**
- Portfolio view of all capital projects by year
- Status indicators: scope status, schedule status, budget status
- Project type classification: ST (Streets), PA (Parks), FA (Facilities)
- CFP reference numbers and project numbers
- Hyperlinks to individual project trackers
- Historical data going back to 2023

**Capital Improvement Plan (2026-2031):**
- 6-year planning horizon
- Total project costs with year-by-year budget allocations
- Project health metrics
- Unfunded projects list

**Capital Facilities Plan (2026-2046):**
- 20-year planning horizon
- Organized by infrastructure type (Sidewalks, Roadways, Parks, Surface Water, Facilities)
- Grant funding tracking
- Project location mapping (start/end points)

### Contracts & Agreements

- Every consultant/contractor has a **signed contract** (PSA - Professional Services Agreement)
- Contracts may have **supplements** that increase the total
- Contracts stored **inconsistently** — sometimes in project folder, sometimes in general contract folder, sometimes duplicated
- Contract execution tracked via **Adobe Sign**
- Related documents: loan contracts (e.g., PWB Loan), grant agreements

### Key Data Identifiers

| Identifier | Where It Lives | Standardized? |
|---|---|---|
| CFP # (Capital Facilities Plan number) | Excel/PDF, adopted by council | Yes, across departments |
| Project Number | Assigned per project | Yes, standardized across departments |
| Budget Code | Springbrook (ERP) | Yes, tied to financial software |
| Invoice Number | On invoices from consultants | Per-vendor format |

---

## Key Pain Points (explicit & implicit)

### Explicitly Identified

1. **Manual metadata entry in SharePoint** — Eric's #1 pain point
   > Eric: "The biggest pain point now with SharePoint is that we have to manually put all the metadata in."

2. **Spreadsheet inconsistency** — at least 3 different formats, no standardization
   > Eric: "Our biggest need right now is just the organization and creating standards."

3. **Manual invoice logging** — every invoice requires manual spreadsheet entry, significant time at scale (7-14 projects × multiple invoices)

4. **Data fragmentation** — contracts, invoices, budgets, grants stored in different SharePoint locations; no single consolidated view

5. **Duplicate work** — PM pre-payment tracking vs. Finance post-payment tracking with no reconciliation

6. **Time lag between project view and finance view** — PM sees invoices immediately, Finance records only after check issuance

7. **No centralized dashboard** — cannot see all projects, invoice status, and budget health in one view

8. **Lack of standardized project initiation** — no template-driven process for starting new capital projects

### Implicitly Identified (from workflow observation)

9. **Manual cross-referencing for reimbursements** — searching SharePoint folders by invoice number to build grant packages

10. **Inconsistent naming conventions** — Shannon acknowledged "I really should standardize how I write it"

11. **Contract storage fragmentation** — contracts in project folders, general folders, or both; hard to find

12. **No automated budget threshold alerts** — PM relies on manual gut-checks to catch overruns

13. **No project status roll-up** — Eric's Gantt is the closest thing but requires manual updates

---

## Ideas, Concepts & Proposals (from the session)

### Daniel's Core Philosophy

> **"Integrate, don't replace."** — SharePoint remains document storage, Springbrook remains financial system, Adobe Sign remains signature workflow. TaskLine/Darwin becomes the coordination and visibility layer.

> **"I'm taking all of the mundane, error-prone, no value-add to the city work off of your plate. So you can put it on the big stuff."**

> **"If I were the CIO, I'd be hell no. We're not doing that. Integrate with the systems we have and make your life better."**

### Priority 1 (Daniel): Automate Basic Invoice Processing Workflow

- Watch SharePoint folder for new invoices
- Auto-ingest invoice, update tracking
- Surface invoice for review and Adobe signature
- Upon approval, auto-move to correct folder and update SharePoint metadata

### Priority 2 (Daniel): Centralized Reporting and Conversational Querying

- Ingest original contracts, budgets, project data
- Build dashboards comparing project team view vs. finance team view with delta identification
- Natural-language queries: "Where is this project at currently?" "How many invoices have been paid?"
- Read-only access to finance tracker for reporting purposes

### Priority 3 — Uber Stretch (Daniel): Lightweight Project Management with Task Templates

- Template-driven project creation with standard milestone checklists
- Auto-creation of tracking structures from budget/contract data ("you initiate the project in Darwin's platform and it builds up the structure")
- Integration with Adobe Sign to auto-detect contract execution status
- SharePoint metadata monitoring for milestone completion
- Agent-based updates via email for offline milestones

### Eric's Vision

- One area where you can see all information about a project
- See invoices, how much spent, contract totals
- Get to all different components from one view
- That view pulls in all different data sources

> **Eric:** "What I'm kind of envisioning is we kind of have this one area where you can see all this information about a project. You can see the invoices, how much has been spent, what's the contract total. And then you can get to all those different components of the project from that one view. But that view is just pulling in all of our different data sources."

### Eric's Existing Parallel Work (in Microsoft Planner)

- Already building milestone checklists in Planner
- Has a "cap template" with checklist items for project phases
- Knows every project has certain milestones that act as a checklist
- Wants templates that create structure when starting a new project

> **Eric:** "There's this actually parallel process that I've been doing in Planner already... I know every project has certain milestones... it acts kind of like a checklist."

### Shannon's Perspective

- Pragmatic — sees value in standardization but constrained by time
- Already independently building milestone checklists in Microsoft Planner
- Strong alignment with proposed solution
- Describes her detailed BTR version as "a better representation of what we are looking for"

### Notification & Integration Concepts Discussed

| Concept | Status | Notes |
|---|---|---|
| Email notification when invoice arrives in SharePoint folder | **Already exists** | They already get emails |
| Auto-ingest invoice from SharePoint folder | **Proposed** | Watch folder, parse PDF |
| Auto-update tracking spreadsheets | **Proposed** | Know naming standards, know what to look for |
| Auto-move signed invoice to correct folder | **Proposed** | After Adobe Sign completion |
| Auto-populate SharePoint metadata | **Proposed** | Requires IT Director coordination on APIs |
| BCC/CC to Darwin for email-based workflow triggers | **Discussed** | One of two notification approaches |
| Agent-initiated email prompts ("hey, you said this was done by X, is it?") | **Discussed** | Alternative to BCC/CC approach |
| Adobe Sign auto-detection of contract execution | **Discussed** | Eric prefers this over email-based checking |
| SharePoint metadata monitoring for milestone completion | **Discussed** | Eric's preferred approach — look for specific schema/metadata in SharePoint |
| Delta notifications (PM view vs Finance view mismatch) | **Discussed tentatively** | Eric: "I don't know" — Finance would probably want it |
| Council agenda packet parsing for authorization dates | **Discussed** | Identified as longer-term, ~1 year maturity goal |

---

## Relationships & Dependencies Map

```
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL SYSTEMS                         │
│                                                              │
│  SharePoint (O365)     Springbrook (ERP)     Adobe Sign      │
│  ├─ Document storage   ├─ Budget codes       ├─ Contract     │
│  ├─ Invoice folders    ├─ Payment processing    signatures   │
│  ├─ Project folders    ├─ Account numbers     ├─ Invoice     │
│  ├─ Contract storage   └─ Fund descriptions     approvals    │
│  └─ Metadata (PAIN)                                          │
│                                                              │
│  Microsoft Planner          O365 Email                       │
│  ├─ Eric's milestone        ├─ Invoice arrival               │
│  │  checklists (parallel)     notifications                  │
│  └─ Cap template            └─ Future: agent prompts         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    TASKLINE / DARWIN                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Project   │  │ Invoice  │  │ Budget   │  │ Template │    │
│  │ Dashboard │  │ Pipeline │  │ Tracking │  │ Engine   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │              │          │
│       └──────────────┴──────────────┴──────────────┘         │
│                          │                                    │
│                    ┌─────┴──────┐                             │
│                    │ AI Layer   │                             │
│                    │ (Phase 4)  │                             │
│                    └────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Invoice Lifecycle

```
Consultant → Email → Finance Dept → SharePoint Folder
                                          │
                                    [notification]
                                          │
                                          ▼
                                    PM Reviews Invoice
                                          │
                                    ┌─────┴─────┐
                                    │ Log to     │
                                    │ Spreadsheet│
                                    │ (by task)  │
                                    └─────┬─────┘
                                          │
                                    Gut-check budget
                                          │
                                    ┌─────┴─────┐
                                    │ Sign via   │
                                    │ Adobe Sign │
                                    └─────┬─────┘
                                          │
                                    Move to "Approved"
                                          │
                              ┌────────────┴────────────┐
                              │                         │
                        Grant-eligible?           Finance pays
                              │                         │
                        Add to reimburse-        Springbrook
                        ment package             records payment
```

### Entity Relationships

```
Capital Facilities Plan (20yr)
  └─ Capital Improvement Plan (6yr)
       └─ Annual Budget (adopted by council)
            └─ Project
                 ├─ CFP # (council-adopted identifier)
                 ├─ Project # (standardized across departments)
                 ├─ Budget Codes → Springbrook account numbers
                 ├─ Funding Sources (grants, local, loans)
                 │    └─ Grant → reimbursement tracking
                 ├─ Contracts (PSAs)
                 │    ├─ Original contract amount
                 │    ├─ Supplements (1..n)
                 │    └─ Cumulative total
                 ├─ Invoices
                 │    ├─ Invoice # (vendor-assigned)
                 │    ├─ Task breakdown (PM, surveying, design, etc.)
                 │    ├─ Grant coding
                 │    └─ Payment status lifecycle:
                 │         Received → Logged → Reviewed → Signed → Paid
                 ├─ Budget Line Items
                 │    ├─ Design (consultant)
                 │    ├─ Right-of-Way
                 │    ├─ CM Services
                 │    ├─ Construction
                 │    ├─ Inspector/Material
                 │    ├─ Permitting
                 │    └─ Misc
                 ├─ Milestones / Phases
                 │    ├─ Initiation
                 │    ├─ Planning (grants, schedule, CAD)
                 │    ├─ Execution
                 │    ├─ Monitoring/Control
                 │    └─ Closure
                 └─ Documents (SharePoint)
                      ├─ Contracts (project folder OR general folder)
                      ├─ Invoices (invoice folder, searchable)
                      ├─ Grants/Loans
                      └─ Reports, Maps, Public Outreach, etc.
```

---

## 875 Capital Project File Structure — Governance Standard

This document defines the **metadata and file organization standard** for capital projects. It maps phases to document types and metadata fields.

| Phase | Subphases | Example Documents | Metadata: Project Type | Metadata: Subject |
|-------|-----------|-------------------|----------------------|-------------------|
| Initiation | Project Charter, Business Documents | Stakeholder requirements | Construction, Programmatic, Facilities | Reports, Maps |
| Planning | Grants, Support Docs, Schedule, Communications, CAD | Grant applications, project schedules | — | Figures, Public Outreach, Stakeholders |
| Execution | (implied) | — | — | Coordination, Presentations |
| Monitoring/Control | (implied) | — | — | — |
| Closure | (implied) | — | — | — |

**Key insight:** This standard exists as a Word document but is **not enforced through any automated system**. It defines what should happen but there's no tooling to make it happen.

---

## Key Quotes Index

| Speaker | Quote | Topic |
|---|---|---|
| Eric | "Our biggest need right now is just the organization and creating standards for what everyone's doing and making sure that everyone does it the same way." | Standardization |
| Eric | "The biggest pain point now with SharePoint is that we have to manually put all the metadata in." | SharePoint |
| Eric | "There's this actually parallel process that I've been doing in Planner already." | Templates |
| Eric | "What I'm kind of envisioning is we kind of have this one area where you can see all this information about a project." | Dashboard |
| Eric | PM vs Finance = "debit card view" vs "check-cleared bank account view" | Delta problem |
| Shannon | "90% of the time this is the standard process." | Invoice workflow |
| Shannon | "I think we could easily standardize whatever we need to. Just our challenge is having the time." | Standardization |
| Shannon | "This budget tracking sheet is way more detailed than any of my others. This might be a better representation of what we are looking for." | BTR template |
| Daniel | "Integrate, don't replace." | Architecture philosophy |
| Daniel | "I'm taking all of the mundane, error-prone, no value-add work off of your plate." | Value proposition |
| Daniel | "If I were the CIO, I'd be hell no. We're not doing that. Integrate with the systems we have." | Against full replacement |
| Eric | "I don't want to... we don't need that... our biggest need is just the organization and creating standards." | Against over-engineering |
| Eric | "Even if we have three different standards, at least then it's only three." | Pragmatic standardization |

---

## Nuances & Design-Critical Details

### Eric's Strong Preference Hierarchy for Automation Triggers

Eric explicitly prefers **metadata/schema inspection in SharePoint** over email-based workflow triggers. When asked about BCC/CC approaches vs. agent emails, he said:

> "I would prefer it to look for a specific schema in a folder in SharePoint or certain metadata in SharePoint."

This means: design the system to watch SharePoint for state changes, not to rely on email parsing or BCC forwarding. Adobe Sign completion should be detected via SharePoint or API, not email.

### Finance Delta — Eric Is Uncertain, Not Committed

When Daniel proposed delta notifications (PM view vs Finance mismatch alerts), Eric's response was genuinely uncertain — he said "I don't know" repeatedly, then deferred to Finance:

> "I think finance will probably eventually want to know... the petition of hey, invoice is here and hasn't been paid, what's going on."

This is an **open requirement**, not a confirmed need. Finance team must be consulted before building this.

### Pre-Payment Focus Is the Core Use Case

> Eric: "I don't really care what we paid... I'm more worried about what we're spending out of."

The timing lag between PM's "debit card view" and Finance's "check-cleared view" is not just a nice-to-have delta report — it's the fundamental architectural challenge. PMs need real-time spend visibility before checks clear.

### Three Distinct Vendor Types Per Project

Construction-phase projects have three separate consultant/contractor relationships, each with independent tracking:

1. **Design consultant** — Shannon's primary focus, tracked by sub-phase
2. **Construction Management (CM) services consultant** — separate contract, separate invoices
3. **Construction contractor** — the actual builder

Each has different contract patterns, invoice schedules, and deliverables. The data model must account for multiple concurrent contracts per project.

### Shannon's Design-Phase Granularity

Shannon tracks **within design phases** with more granularity than Eric. Her detailed BTR version breaks tasks into sub-phases (the 32-column breakdown). This is because she primarily manages design-phase projects, while Eric manages through construction. The "standardized" template needs to accommodate both depths.

### Invoice Number as Primary Cross-Reference Key

Invoice numbers are the primary lookup key Shannon uses when:
- Building grant reimbursement packages
- Cross-referencing between spreadsheets and SharePoint folders
- Verifying totals between her tracking and the source invoice

System design must make invoice number a first-class searchable identifier.

### Naming Convention Inconsistency

> Shannon: "I really should standardize how I write it."

She acknowledged her grant coding and naming isn't consistent. This affects automation — auto-parsing requires consistent patterns. The system should enforce naming standards rather than inherit existing inconsistency.

### Operations Cost Tracking Exists Separately

Shannon mentioned early in the session that they have "another method for cost tracking just for overall operations" distinct from capital projects. This is out of scope for now but worth noting — the platform could potentially extend there later.

### Right-of-Way (ROW) Tracking Is Structurally Different

Eric's ROW tracking uses **parcel numbers** and tracks expenditures per parcel — different from invoice-based tracking. For construction projects, this is a distinct budget category with its own data shape.

### Lori as Access & Permissions Gatekeeper

Lori controls access to SharePoint sites, copies of files, and permissions. She's the one who will:
- Send the link to the SharePoint capital projects site
- Make copies of documents for Daniel
- Coordinate with Shannon and Eric on which files to share

This is critical for solution rollout — Lori is the operational bottleneck for data access.

### Eric's Existing Planner Work — Integration, Not Replacement

Eric is already independently building milestone checklists in Microsoft Planner. He has a "cap template" with checklist items. This is **existing infrastructure** that the solution should integrate with or supersede, not ignore. He's already doing the template-thinking work; he just doesn't have the system to support it.

### Rapid Prototyping as Delivery Methodology

Daniel's approach is explicit: semi-functional mockup → validate with team → convert to requirements doc → dev team builds. He referenced building a comparable mockup in ~1.5 days for another client. This is the engagement methodology, not just a task.

### Council Authorization Dates — Daniel Expressed Uncertainty

> Daniel: "That would be a longer term or mature goal... I shouldn't talk because I like to talk to you."

Daniel isn't confident in the technical feasibility of parsing council agenda packets for authorization dates. This should be treated as a research item, not a commitment.

---

## Risk Factors & Open Questions (from session)

| Item | Source | Status |
|---|---|---|
| Finance team not yet engaged as stakeholder | Summary | Open — deferred |
| IT Director coordination needed for SharePoint API access | Eric/Daniel | Open — needs meeting |
| Springbrook integration complexity — budget codes may not have direct system access | Daniel | Open — read-only only |
| Council authorization dates & agenda packet parsing | Eric | Deferred — ~1 year goal |
| Email workflow triggers (BCC/CC) require behavioral change | Daniel | Evaluating alternatives |
| Scope creep from invoice tracking to full project lifecycle management | Daniel | Acknowledged risk |
| Finance team's master tracker — can Daniel get access? | Lori | Lori sending link |
| SharePoint site for document sharing — Daniel needs access | Lori | Lori setting up |
| Standardization across 3+ formats requires team effort | All | Acknowledged |

---

## Agreed Next Steps (from session)

1. **Lori** sends link to SharePoint site with capital project data (spreadsheets, invoices, contracts, financial trackers)
2. **Shannon and Eric** provide example documents: 2 capital projects each with invoices, contracts, budget docs, the city's master financial tracker
3. **Daniel** reviews collected data and builds rapid prototype / semi-functional mockup
4. **Daniel** coordinates with IT Director once solution is more concrete (SharePoint metadata automation, API access)
5. **Review session** — Daniel presents mockup to team for validation before development begins
6. Validated mockup converts to requirements document for dev team

**Daniel's priority order:**
1. Basic invoicing workflow (Priority 1)
2. Centralized reporting + conversational querying (Priority 2 — Stretch)
3. Template-based project initiation with TaskLine integration (Priority 3 — Uber Stretch)

**Estimated mockup build time:** ~1.5 days from requirements alone (based on prior experience with similar engagement)
