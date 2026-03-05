import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export const projectsRouter = router({
    // List all projects with computed budget health
    list: publicProcedure.query(async () => {
        const projects = await db.query.projects.findMany({
            with: {
                budgetLineItems: true,
                fundingSources: true,
                contracts: { with: { supplements: true } },
            },
        });

        return projects.map((p) => {
            const totalBudget = p.fundingSources.reduce((s, f) => s + f.allocatedAmount, 0);
            const totalProjected = p.budgetLineItems.reduce((s, b) => s + b.projectedCost, 0);
            return {
                ...p,
                computed: { totalBudget, totalProjected },
            };
        });
    }),

    // Get single project with full detail
    byId: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.id),
                with: {
                    contracts: { with: { supplements: true, invoices: true } },
                    fundingSources: true,
                    budgetLineItems: true,
                    invoices: { with: { taskBreakdowns: true } },
                    rowParcels: true,
                    phases: true,
                },
            });

            if (!project) throw new Error("Project not found");

            // Compute paidToDate for each budget line item from invoice task breakdowns
            // [trace: invariant — paidToDate is COMPUTED, never stored]
            const budgetWithComputed = project.budgetLineItems.map((bli) => {
                const breakdowns = project.invoices.flatMap((inv) =>
                    inv.taskBreakdowns.filter((tb) => tb.budgetLineItemId === bli.id)
                );
                const paidToDate = breakdowns.reduce((s, tb) => s + tb.amount, 0);
                const balanceRemaining = bli.projectedCost - paidToDate;
                const percentSpent = bli.projectedCost > 0 ? (paidToDate / bli.projectedCost) * 100 : 0;

                return {
                    ...bli,
                    computed: { paidToDate, balanceRemaining, percentSpent },
                };
            });

            const totalBudget = project.fundingSources.reduce((s, f) => s + f.allocatedAmount, 0);
            const totalPaid = budgetWithComputed.reduce((s, b) => s + b.computed.paidToDate, 0);
            const totalProjected = budgetWithComputed.reduce((s, b) => s + b.projectedCost, 0);

            return {
                ...project,
                budgetLineItems: budgetWithComputed,
                computed: { totalBudget, totalPaid, totalProjected },
            };
        }),

    // Create a new project
    create: publicProcedure
        .input(
            z.object({
                name: z.string().min(1),
                cfpNumber: z.string().optional(),
                projectNumber: z.string().optional(),
                type: z.enum(schema.PROJECT_TYPES).optional(),
                description: z.string().optional(),
                projectManager: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const [project] = await db.insert(schema.projects).values(input).returning();
            return project;
        }),

    // Delete a project (used by local smoke/test tooling cleanup)
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(schema.projects)
                .where(eq(schema.projects.id, input.id))
                .returning();

            if (!deleted) {
                throw new Error(`Project ${input.id} not found`);
            }

            return { success: true };
        }),
});
