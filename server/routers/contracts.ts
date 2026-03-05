import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureBudgetLineItems } from "../lib/budgetLineItems.js";

/**
 * Contracts router — CRUD for contracts and supplements.
 * [trace: discovery L149-155, L89-93 — contracts with supplements]
 * [trace: skill budget-auto-generator — auto-generate BLIs from contract type]
 */

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
            // [trace: dev-plan L146-155, skill budget-auto-generator]
            await ensureBudgetLineItems(input.projectId, input.type);

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
