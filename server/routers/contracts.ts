import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Contracts router — CRUD for contracts and supplements.
 * [trace: discovery L149-155, L89-93 — contracts with supplements]
 * [trace: skill budget-auto-generator — auto-generate BLIs from contract type]
 */

// Budget line items auto-generated per contract type
// [trace: dev-plan L146-155, skill budget-auto-generator]
const CONTRACT_TYPE_TO_BUDGET_CATEGORIES: Record<string, { category: string; optional: boolean }[]> = {
    Design: [
        { category: "Design", optional: false },
        { category: "Permitting", optional: true },
    ],
    CM_Services: [
        { category: "CM_Services", optional: false },
        { category: "Inspector_Material", optional: true },
    ],
    Construction: [
        { category: "Construction", optional: false },
        { category: "Misc", optional: true },
    ],
};

export const contractsRouter = router({
    // List contracts for a project
    list: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            return db.query.contracts.findMany({
                where: eq(schema.contracts.projectId, input.projectId),
                with: {
                    supplements: true,
                    invoices: true,
                },
            });
        }),

    // Create contract + auto-generate budget line items
    // [trace: skill budget-auto-generator]
    create: publicProcedure
        .input(
            z.object({
                projectId: z.number(),
                vendor: z.string().min(1),
                contractNumber: z.string().optional(),
                type: z.enum(schema.CONTRACT_TYPES),
                originalAmount: z.number().default(0),
                signedDocumentLink: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const [contract] = await db
                .insert(schema.contracts)
                .values(input)
                .returning();

            // Auto-generate budget line items based on contract type
            const categories = CONTRACT_TYPE_TO_BUDGET_CATEGORIES[input.type] || [];
            for (const cat of categories) {
                // Check if this category already exists for the project
                const existing = await db.query.budgetLineItems.findFirst({
                    where: (bli, { and, eq: e }) =>
                        and(
                            e(bli.projectId, input.projectId),
                            e(bli.category, cat.category as any)
                        ),
                });

                if (!existing) {
                    await db.insert(schema.budgetLineItems).values({
                        projectId: input.projectId,
                        category: cat.category as any,
                        projectedCost: 0,
                        percentScopeComplete: 0,
                    });
                }
            }

            return contract;
        }),

    // Add supplement to contract
    // [trace: discovery L108, dev-plan L282-284 — supplements as discrete records]
    addSupplement: publicProcedure
        .input(
            z.object({
                contractId: z.number(),
                supplementNumber: z.number(),
                amount: z.number(),
                date: z.string().optional(),
                description: z.string().optional(),
                signedDocumentLink: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const [supplement] = await db
                .insert(schema.contractSupplements)
                .values(input)
                .returning();
            return supplement;
        }),
});
