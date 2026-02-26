import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

/**
 * Grants router — grant reimbursement package building.
 * Filters invoices by grantEligible flag and optional grantCode,
 * then assembles a structured reimbursement package for submission.
 */
export const grantsRouter = router({
    // List grant-eligible invoices for a project, with task breakdowns and computed totals
    grantEligibleInvoices: publicProcedure
        .input(
            z.object({
                projectId: z.number(),
                grantCode: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            const conditions = [
                eq(schema.invoices.projectId, input.projectId),
                eq(schema.invoices.grantEligible, true),
            ];
            if (input.grantCode) {
                conditions.push(eq(schema.invoices.grantCode, input.grantCode));
            }

            const invoices = await db.query.invoices.findMany({
                where: and(...conditions),
                with: { taskBreakdowns: true },
            });

            const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

            return { invoices, totalAmount };
        }),

    // Generate a structured reimbursement package for grant submission
    generateReimbursementPackage: publicProcedure
        .input(
            z.object({
                projectId: z.number(),
                grantCode: z.string(),
            })
        )
        .query(async ({ input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
            });

            const invoices = await db.query.invoices.findMany({
                where: and(
                    eq(schema.invoices.projectId, input.projectId),
                    eq(schema.invoices.grantEligible, true),
                    eq(schema.invoices.grantCode, input.grantCode),
                ),
                with: { taskBreakdowns: true },
            });

            const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

            return {
                grantCode: input.grantCode,
                projectName: project?.name ?? "Unknown Project",
                eligibleInvoices: invoices.map((inv) => ({
                    number: inv.invoiceNumber,
                    vendor: inv.vendor,
                    amount: inv.totalAmount,
                    date: inv.dateReceived,
                    taskBreakdowns: inv.taskBreakdowns.map((tb) => ({
                        taskCode: tb.taskCode,
                        taskDescription: tb.taskDescription,
                        amount: tb.amount,
                    })),
                })),
                totalAmount,
                generatedDate: new Date().toISOString(),
            };
        }),
});
