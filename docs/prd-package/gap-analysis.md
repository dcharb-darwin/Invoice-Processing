# Gap Analysis — Things You Didn't Think About

> Areas that emerged from deep-reading the discovery transcript and cross-referencing against the current data model and PRD. These are **not in any existing PRD or implementation** — they're gaps waiting to become pain points.

---

## 1. Multi-PM Concurrent Edit Conflict

**Risk:** Both Eric and Shannon could import/export the same project's .xlsx simultaneously during transition.

**Current state:** No conflict detection. Last-write-wins.

**What's needed:** At minimum, a warning: "This project was last exported 2 hours ago by Shannon. You are importing Eric's version from 4 hours ago. Proceed?" At scale, consider a version number or checksum in the .xlsx header.

---

## 2. Fiscal Year Rollover

**Risk:** Budget allocations reset annually. When 2026 becomes 2027, projects that span years need their funding sources updated.

**From discovery:** Eric's Budget Worksheet has year columns (2025, 2026, 2027). The CIP has a 6-year schedule.

**What's needed:**
- A fiscal year concept in the data model (currently missing)
- Budget carryforward logic — unspent 2026 funds rolling into 2027
- Historical snapshot: freeze budget state at year-end for audit purposes

---

## 3. Retainage Tracking

**Risk:** Construction contracts commonly hold back 5-10% retainage until project completion. This is a real amount that affects budget reporting.

**From discovery:** Not mentioned explicitly, but retainage is standard practice in public works construction contracts.

**What's needed:**
- `retainagePercent` field on Construction contracts
- `retainageAmount` computed per invoice (amount × retainage%)
- Retainage release as a separate transaction type
- Adjust "Paid to Date" to show with-retainage and without-retainage views

---

## 4. Change Orders vs. Supplements

**Risk:** Eric tracks **supplements** (contract amendments that increase scope/cost). Construction projects also have **change orders** — scope changes that may or may not change the contract amount.

**Current model:** Only has `contractSupplements`. No change order concept.

**What's needed:** Clarify with Eric/Shannon: do they track change orders separately from supplements? For construction projects, change orders are often the primary mechanism for cost changes, and they have different approval workflows.

---

## 5. Audit Trail / Change Log

**Risk:** Municipal budget tracking is subject to public records requests and audit. "Who changed what, when" is not optional — it's a compliance requirement.

**Current state:** No change tracking in IPC. No user authentication.

**What's needed:**
- At minimum: timestamp + IP on every data mutation
- At production: full audit log (user, action, old value, new value, timestamp)
- Export of audit log for public records requests

> [!IMPORTANT]
> This becomes critical the moment this moves past prototype into production. The city's Finance Director will ask about this.

---

## 6. Vendor Master Data

**Risk:** Vendors appear across multiple projects (e.g., David Evans & Associates does Design for both Main Street and 36th St Bridge). Currently, vendor names are free-text — "David Evans" vs "David Evans & Associates" vs "DEA" are three different vendors.

**What's needed:**
- Vendor lookup / autocomplete
- Vendor master list with standardized names
- Cross-project vendor reporting: "Show me all contracts with David Evans across all projects"

---

## 7. Insurance Certificates & Bond Tracking

**Risk:** Construction contracts require insurance certificates, performance bonds, and payment bonds. These expire and need renewal tracking.

**From discovery:** Not mentioned, but standard for public works.

**What's needed (Vision-tier):**
- Bond tracking per contract (performance bond, payment bond)
- Insurance certificate expiration dates with alerts
- Possibly: auto-checking against city requirements

---

## 8. Prevailing Wage Compliance

**Risk:** Public works projects in Washington State are subject to prevailing wage requirements. Invoice certification often requires a prevailing wage affidavit.

**What's needed (Vision-tier):**
- Prevailing wage flag per contract
- Certified payroll tracking or reference
- Intent/Affidavit document links per invoice

---

## 9. Project Closeout Workflow

**Risk:** No concept of "project complete" in the current model beyond setting `status = completed`. Real closeout involves: final invoice, retainage release, final grant reimbursement, as-built document filing, warranty period tracking.

**What's needed (Vision-tier):**
- Closeout checklist (similar to Eric's Planner template concept)
- Final cost vs. budget variance report
- Warranty expiration tracking
- As-built document link

---

## 10. Finance Team Engagement — The Phase Gate

> [!WARNING]
> The Finance team (Anna, the Finance Director) has not been part of any discovery session. Several features assume Finance data access.

**Blocked items without Finance engagement:**
- Finance tracker import (Phase 2 of budget ingestion)
- PM-vs-Finance delta view
- Springbrook code validation
- Post-payment reconciliation

**Recommendation:** Schedule a separate discovery session with Finance before building any Finance-facing features. Eric explicitly deferred this: "I think right now I'm going to end this conversation on the window."

---

## Priority Matrix

| Gap | Impact | Effort | When |
|-----|--------|--------|------|
| Multi-PM conflict detection | Medium | Low | Before SharePoint sync |
| Fiscal year rollover | High | Medium | Before Jan 2027 |
| Retainage tracking | High (construction only) | Medium | Before construction project tracking |
| Change orders vs supplements | Medium | Low (clarification needed) | Next customer session |
| Audit trail | **Critical for production** | High | Before production deployment |
| Vendor master data | Medium | Low | Near-term |
| Insurance/bond tracking | Low (nice-to-have) | Medium | Vision phase |
| Prevailing wage | Low (compliance) | Medium | Vision phase |
| Project closeout | Medium | Medium | Vision phase |
| Finance engagement | **Gate** | Calendar time | Before any Finance features |
