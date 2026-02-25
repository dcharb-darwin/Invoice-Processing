---
description: Generate a demo package for customer review
---

# /generate-demo-package

Create a complete demo package for presenting the prototype to Eric, Shannon, and the Lake Stevens team.

## Steps

1. Create `docs/demo-instructions.md` with:
   - How to start the dev server
   - Step-by-step walkthrough of each feature
   - What to show Eric (his 18013 Main Street data)
   - What to show Shannon (her 36th St Bridge data)
   - Talking points for each screen

2. Create `docs/screenshots/` directory.

3. Use the browser tool to navigate through the running app and capture screenshots of:
   - Project list / portfolio view
   - Project detail with budget breakdown
   - Invoice entry form
   - Gut-check alerts (green/yellow/red)
   - Import flow
   - Export result

4. Create `docs/customer-review-script.md` with:
   - Questions to ask Eric and Shannon
   - Areas where feedback is needed
   - Features to validate against acceptance criteria
   - Open design decisions for customer input

5. Update `docs/comprehensive-prd.md` Demo Instructions section.

6. Commit: `docs: generate demo package [trace: customer-validation]`
