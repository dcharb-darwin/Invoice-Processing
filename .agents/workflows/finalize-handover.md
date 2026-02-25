---
description: Finalize handover package for dev team
---

# /finalize-handover

Create the complete handover package that the real dev team will use to build the production system.

## Steps

1. Run `/regenerate-full-prd` to ensure PRD is fully up to date.

2. Run `/generate-demo-package` to ensure demo materials exist.

3. Create `docs/handover-package/` directory.

4. Copy into handover package:
   - `docs/comprehensive-prd.md` (the primary deliverable)
   - `docs/demo-instructions.md`
   - `docs/customer-review-script.md`
   - `docs/screenshots/` directory
   - All source discovery documents (markdown only)

5. Create `docs/handover-package/README.md` with:
   - What this package contains
   - How to read the PRD
   - What the prototype code is (disposable POC)
   - Where to find the real requirements
   - Known limitations and open questions
   - Recommended tech stack for production

6. Create `docs/handover-package/prototype-notes.md` with:
   - Architecture decisions and rationale
   - What shortcuts were taken for speed
   - What must be rebuilt properly
   - Security/auth considerations for production
   - Integration points (SharePoint, Springbrook, Adobe Sign)

7. Commit: `docs: finalize handover package [trace: delivery]`
