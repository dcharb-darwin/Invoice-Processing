import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, like, desc } from "drizzle-orm";
import { z } from "zod";

/**
 * Invoices router — CRUD + task breakdowns + search.
 * [trace: discovery L117-124, dev-plan L117-129]
 * [trace: invariant — invoice task breakdown IS the source of truth for budget totals]
 */
export const invoicesRouter = router({
    // List invoices for a project with task breakdowns
    list: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            return db.query.invoices.findMany({
                where: eq(schema.invoices.projectId, input.projectId),
                with: { taskBreakdowns: true },
                orderBy: [desc(schema.invoices.dateReceived)],
            });
        }),

    // Create invoice with task breakdowns (batch)
    // [trace: dev-plan L125-129 — task breakdown rolls up into BLI paidToDate]
    create: publicProcedure
        .input(
            z.object({
                projectId: z.number(),
                contractId: z.number().optional(),
                invoiceNumber: z.string().min(1),
                vendor: z.string().optional(),
                totalAmount: z.number(),
                dateReceived: z.string().optional(),
                dateApproved: z.string().optional(),
                status: z.enum(schema.INVOICE_STATUSES).default("Received"),
                grantEligible: z.boolean().default(false),
                grantCode: z.string().optional(),
                taskBreakdowns: z.array(
                    z.object({
                        budgetLineItemId: z.number(),
                        taskCode: z.string().optional(),
                        taskDescription: z.string().optional(),
                        amount: z.number(),
                    })
                ).default([]),
            })
        )
        .mutation(async ({ input }) => {
            const { taskBreakdowns, ...invoiceData } = input;

            const [invoice] = await db
                .insert(schema.invoices)
                .values(invoiceData)
                .returning();

            // Insert task breakdowns
            if (taskBreakdowns.length > 0) {
                await db.insert(schema.invoiceTaskBreakdown).values(
                    taskBreakdowns.map((tb) => ({
                        ...tb,
                        invoiceId: invoice.id,
                    }))
                );
            }

            return invoice;
        }),

    // Update invoice status
    updateStatus: publicProcedure
        .input(
            z.object({
                id: z.number(),
                status: z.enum(schema.INVOICE_STATUSES),
                dateApproved: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            const [updated] = await db
                .update(schema.invoices)
                .set(data)
                .where(eq(schema.invoices.id, id))
                .returning();
            return updated;
        }),

    // Search invoices by number across all projects
    // [trace: discovery L469-476 — Shannon uses invoice # as primary lookup key]
    search: publicProcedure
        .input(z.object({ query: z.string().min(1) }))
        .query(async ({ input }) => {
            return db.query.invoices.findMany({
                where: like(schema.invoices.invoiceNumber, `%${input.query}%`),
                with: { taskBreakdowns: true },
                orderBy: [desc(schema.invoices.dateReceived)],
            });
        }),
});
