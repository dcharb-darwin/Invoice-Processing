# UI/UX Consistency Program — PRD

> [!NOTE]
> This PRD standardizes interaction and visual behavior across invoice, contract, and project surfaces while preserving TaskLine parity.

---

## 1. Design Intent

Goal: enforce one consistent interaction model across all major surfaces without changing core workflows.

Constraints:
- Keep TaskLine-aligned visual language.
- Standardize behavior before introducing new visual direction.
- Prefer shared primitives over per-page custom implementations.

---

## 2. Shared Primitive Standards

### 2.1 StatusBadge (Invoice Lifecycle)

One canonical status mapping used everywhere:
- `Received` (neutral)
- `Logged` (info)
- `Reviewed` (warning)
- `Signed` (approval)
- `Paid` (success)

Rules:
1. Same label, color token, and shape on every surface.
2. Unknown statuses fall back to neutral style.

### 2.2 ModalShell

One modal container contract:
1. Shared backdrop and blur treatment.
2. Click-outside close behavior for standard modals.
3. Optional `Escape` close support.
4. Shared max-width, padding, header, and footer spacing tokens.

### 2.3 SourceDocLink and EntityLink

One link affordance contract:
1. Entity identifiers are visibly interactive on all surfaces.
2. Source document labels are consistent (`📄 Source`, `📄 Signed`, `📄 Contract`).
3. Missing sources render explicit empty state (not silent omission).

### 2.4 Hash Route Builder

One route helper for project tab deep links:
- project home
- project tab (budget, contracts, invoices, funding, row/parcels, phases)

This removes hand-built hash strings and canonicalizes navigation.

### 2.5 Navigation Visibility & Modal Viewport Control

#### Active Navigation State Contract

Applies to all top-level nav/tab controls (global header nav, project tab strip, modal document tabs):
1. Active state must differ from inactive state by background + text + indicator; never by text color alone.
2. Active state must remain obvious in both light and dark themes.
3. Focus-visible ring must be present for keyboard navigation.
4. Active route controls should expose `aria-current=\"page\"` where applicable.
5. Toggle-style tab controls should expose `aria-pressed` where applicable.

#### Modal Viewport Contract

Applies to the Invoice Pipeline editing modal:
1. Default mode remains windowed for continuity.
2. Modal header exposes maximize/restore toggle.
3. Maximized mode uses near-fullscreen viewport dimensions for editing + document review.
4. Existing close behavior remains intact (`Escape`, backdrop click, close button).

---

## 3. Cross-Surface Consistency Matrix

| Entity | Surface | Required Consistency |
|---|---|---|
| Invoice | ProjectDetail / InvoiceSearch / InvoicePipeline / GrantPackage | Same status badge semantics; same source/signed document label behavior |
| Contract | ProjectDetail / InvoiceSearch / InvoicePipeline / GrantPackage | Same contract-number link behavior and document-link rendering |
| Project | ProjectsList / PortfolioDashboard / detail overlays | Same destination semantics for project links |
| Modal dialogs | NewProject / SyncSettings / TaskLine import / Pipeline detail modal | Same shell, close affordances, spacing, and token usage |

---

## 4. Accessibility and Responsive Requirements

1. Interactive non-button elements must maintain visible affordance and keyboard focusability where applicable.
2. Modal close controls remain reachable at mobile widths.
3. Split-view invoice detail behavior degrades to single-column stacking at smaller widths.
4. Color semantics cannot be the only state indicator where practical (status text remains visible).

---

## 5. Implementation Requirements

### 5.1 Required Shared Infrastructure

- `StatusBadge` shared component
- `ModalShell` shared component
- `SourceDocLink` and `EntityLink` shared components
- centralized hash-route helper

### 5.2 Required Adoption Surfaces

- `src/pages/ProjectDetail.tsx`
- `src/pages/InvoiceSearch.tsx`
- `src/pages/InvoicePipeline.tsx`
- `src/pages/GrantPackage.tsx`
- `src/pages/InvoiceDetailPanel.tsx`
- `src/pages/NewProjectModal.tsx`
- `src/pages/SyncSettings.tsx`

---

## 6. Acceptance Criteria

1. No duplicate status color map definitions across pages.
2. No duplicated modal overlay shell definitions across pages.
3. Canonical route helper is used for project-tab links.
4. Source-document rendering is consistent across invoice/contract surfaces.
5. `npm run build` passes.
6. Reviewer gate confirms cross-surface consistency checklist is complete.

---

## 7. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Shared primitive extraction causes visual regressions | Medium | Snapshot checks on all adopted pages |
| Route helper rollout breaks deep links | High | Keep route helper backward-compatible with existing hash map |
| Incomplete adoption leaves residual drift | Medium | Enforce explicit adoption checklist per surface |

---

## 8. Traceability

- Standardization need: `docs/discovery/00-discovery-extraction.md` (Eric standards quote)
- Cross-component consistency requirement: `agents.md` Universal Contextual Navigation invariant
- PRD-first and shared infrastructure requirement: `.agents/workflows/pattern-first-dispatch.md`
