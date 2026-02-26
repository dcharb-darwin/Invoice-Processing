import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { z } from "zod";

/**
 * Templates Router — capital project template creation.
 * Encodes the 875 Standard phases and common budget structures
 * derived from Eric's and Shannon's real project data.
 *
 * [trace: 00-discovery-extraction.md L188 — lack of standardized project initiation]
 * [trace: 00-discovery-extraction.md L395-407 — 875 Capital Project File Structure]
 * [trace: 01-development-plan.md L298-300 — 875 Standard becomes a template]
 */

// ---------------------------------------------------------------------------
// Template definitions (could be DB-driven later; hardcoded for now)
// ---------------------------------------------------------------------------

const CAPITAL_PROJECT_TEMPLATE = {
    id: "capital_project",
    name: "Capital Project",
    description: "Standard capital project with 875-compliant phases and budget structure",

    budgetCategories: [
        { category: "Design", defaultProjected: 0, description: "Design consultant (PSA)" },
        { category: "ROW", defaultProjected: 0, description: "Right-of-way acquisition & easements" },
        { category: "CM_Services", defaultProjected: 0, description: "Construction management services" },
        { category: "Construction", defaultProjected: 0, description: "Primary construction contractor" },
        { category: "Permitting", defaultProjected: 0, description: "Permits + environmental" },
        { category: "Inspector_Material", defaultProjected: 0, description: "Inspection & materials testing" },
        { category: "Misc", defaultProjected: 0, description: "Miscellaneous expenses" },
    ],

    contractSlots: [
        { type: "Design", label: "Design Consultant (PSA)" },
        { type: "CM_Services", label: "CM Services Consultant (PSA)" },
        { type: "Construction", label: "Construction Contractor" },
    ],

    phases: [
        {
            name: "Initiation", order: 1,
            checklist: [
                { item: "Project Charter", done: false },
                { item: "Stakeholder Identification", done: false },
                { item: "Council Authorization", done: false },
                { item: "Budget Code Assignment (Springbrook)", done: false },
            ],
        },
        {
            name: "Planning", order: 2,
            checklist: [
                { item: "Grant Applications Submitted", done: false },
                { item: "Project Schedule Created", done: false },
                { item: "CAD/Design Kickoff", done: false },
                { item: "Communications Plan", done: false },
                { item: "Environmental Review", done: false },
            ],
        },
        {
            name: "Execution", order: 3,
            checklist: [
                { item: "Design Contract Executed", done: false },
                { item: "Notice to Proceed Issued", done: false },
                { item: "ROW Acquisition Complete", done: false },
                { item: "Construction Contract Awarded", done: false },
                { item: "CM Services Contract Executed", done: false },
            ],
        },
        {
            name: "Monitoring/Control", order: 4,
            checklist: [
                { item: "Invoice Review Process Active", done: false },
                { item: "Monthly Budget Check", done: false },
                { item: "Scope % Tracking Current", done: false },
                { item: "Change Orders Documented", done: false },
            ],
        },
        {
            name: "Closure", order: 5,
            checklist: [
                { item: "Final Payments Processed", done: false },
                { item: "Closeout Documentation Complete", done: false },
                { item: "Grant Reimbursement Submitted", done: false },
                { item: "As-Built Records Filed", done: false },
                { item: "Project Acceptance Signed", done: false },
            ],
        },
    ],
};

const TEMPLATES = [CAPITAL_PROJECT_TEMPLATE];

export const templatesRouter = router({
    /**
     * List available project templates.
     */
    list: publicProcedure.query(() => {
        return TEMPLATES.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            budgetCategoryCount: t.budgetCategories.length,
            phaseCount: t.phases.length,
        }));
    }),

    /**
     * Get full template details for preview.
     */
    getTemplate: publicProcedure
        .input(z.object({ templateId: z.string() }))
        .query(({ input }) => {
            const template = TEMPLATES.find((t) => t.id === input.templateId);
            if (!template) throw new Error(`Template ${input.templateId} not found`);
            return template;
        }),

    /**
     * Create a project from a template.
     * Auto-populates budget line items, phases, and checklist.
     */
    createProjectFromTemplate: publicProcedure
        .input(
            z.object({
                templateId: z.string(),
                name: z.string().min(1),
                cfpNumber: z.string().optional(),
                projectNumber: z.string().optional(),
                type: z.string().optional(),
                projectManager: z.string().optional(),
                description: z.string().optional(),
                // Which budget categories to include (indices into template)
                selectedCategories: z.array(z.number()).optional(),
                // Which phases to include (indices into template)
                selectedPhases: z.array(z.number()).optional(),
            })
        )
        .mutation(async ({ input }) => {
            const template = TEMPLATES.find((t) => t.id === input.templateId);
            if (!template) throw new Error(`Template ${input.templateId} not found`);

            // 1. Create project
            const [project] = await db
                .insert(schema.projects)
                .values({
                    name: input.name,
                    cfpNumber: input.cfpNumber || undefined,
                    projectNumber: input.projectNumber || undefined,
                    type: (input.type as any) || "ST",
                    description: input.description || template.description,
                    projectManager: input.projectManager || undefined,
                    status: "Active",
                })
                .returning();

            // 2. Create budget line items (filtered by selection if provided)
            const selectedCats = input.selectedCategories ?? template.budgetCategories.map((_, i) => i);
            const budgetValues = selectedCats
                .map((i) => template.budgetCategories[i])
                .filter(Boolean)
                .map((cat) => ({
                    projectId: project.id,
                    category: cat.category as schema.BudgetCategory,
                    projectedCost: cat.defaultProjected,
                }));

            if (budgetValues.length > 0) {
                await db.insert(schema.budgetLineItems).values(budgetValues);
            }

            // 3. Create phases (filtered by selection if provided)
            const selectedPhases = input.selectedPhases ?? template.phases.map((_, i) => i);
            const phaseValues = selectedPhases
                .map((i) => template.phases[i])
                .filter(Boolean)
                .map((phase) => ({
                    projectId: project.id,
                    name: phase.name,
                    order: phase.order,
                    status: "Not Started",
                    checklist: JSON.stringify(phase.checklist),
                }));

            if (phaseValues.length > 0) {
                await db.insert(schema.projectPhases).values(phaseValues);
            }

            return { project };
        }),

    /**
     * Update a phase's checklist (toggle items).
     */
    updatePhaseChecklist: publicProcedure
        .input(
            z.object({
                phaseId: z.number(),
                checklist: z.array(z.object({ item: z.string(), done: z.boolean() })),
            })
        )
        .mutation(async ({ input }) => {
            const { eq } = await import("drizzle-orm");
            const allDone = input.checklist.every((c) => c.done);
            const anyDone = input.checklist.some((c) => c.done);
            const status = allDone ? "Complete" : anyDone ? "In Progress" : "Not Started";

            const [updated] = await db
                .update(schema.projectPhases)
                .set({
                    checklist: JSON.stringify(input.checklist),
                    status,
                })
                .where(eq(schema.projectPhases.id, input.phaseId))
                .returning();

            return updated;
        }),
});
