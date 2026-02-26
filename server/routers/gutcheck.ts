import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Gut-Check Engine router — computes budget health alerts.
 * [trace: skill gutcheck-engine — thresholds and alert rules]
 * [trace: discovery L31-32 — Shannon's manual "13% complete — does that sound right?"]
 * [trace: dev-plan L159-177 — gut-check engine specification]
 */

export type AlertSeverity = "green" | "yellow" | "red";

export interface GutCheckAlert {
    type: "budget_line_item" | "project_budget" | "contract_overrun";
    severity: AlertSeverity;
    entityId: number;
    entityName: string;
    message: string;
    percentSpent?: number;
    percentScope?: number;
}

export const gutcheckRouter = router({
    // Get all gut-check alerts for a project
    // [trace: skill gutcheck-engine — full alert computation]
    forProject: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }): Promise<GutCheckAlert[]> => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
                with: {
                    budgetLineItems: true,
                    fundingSources: true,
                    contracts: { with: { supplements: true } },
                    invoices: { with: { taskBreakdowns: true } },
                },
            });

            if (!project) return [];

            const alerts: GutCheckAlert[] = [];

            // 1. Budget line item: % spent vs % scope complete
            // [trace: skill gutcheck-engine step 1 — yellow at +15%, red at +30%]
            for (const bli of project.budgetLineItems) {
                const paidToDate = project.invoices
                    .flatMap((inv) => inv.taskBreakdowns)
                    .filter((tb) => tb.budgetLineItemId === bli.id)
                    .reduce((sum, tb) => sum + tb.amount, 0);

                const percentSpent = bli.projectedCost > 0
                    ? paidToDate / bli.projectedCost
                    : 0;
                const percentScope = (bli.percentScopeComplete ?? 0) / 100;

                let severity: AlertSeverity = "green";
                if (percentSpent > percentScope + 0.30) {
                    severity = "red";
                } else if (percentSpent > percentScope + 0.15) {
                    severity = "yellow";
                }

                if (severity !== "green") {
                    alerts.push({
                        type: "budget_line_item",
                        severity,
                        entityId: bli.id,
                        entityName: bli.category,
                        message: `${bli.category} is ${Math.round(percentSpent * 100)}% spent but only ${Math.round(percentScope * 100)}% complete`,
                        percentSpent: Math.round(percentSpent * 100),
                        percentScope: Math.round(percentScope * 100),
                    });
                }
            }

            // 2. Project budget: total spent vs total budget
            // [trace: skill gutcheck-engine step 2 — yellow at 85%, red at 95%]
            const totalBudget = project.fundingSources.reduce(
                (sum, fs) => sum + fs.allocatedAmount, 0
            );
            const totalPaid = project.invoices
                .flatMap((inv) => inv.taskBreakdowns)
                .reduce((sum, tb) => sum + tb.amount, 0);

            if (totalBudget > 0) {
                const budgetRatio = totalPaid / totalBudget;
                let severity: AlertSeverity = "green";
                if (budgetRatio > 0.95) {
                    severity = "red";
                } else if (budgetRatio > 0.85) {
                    severity = "yellow";
                }

                if (severity !== "green") {
                    alerts.push({
                        type: "project_budget",
                        severity,
                        entityId: project.id,
                        entityName: project.name,
                        message: `Project is at ${Math.round(budgetRatio * 100)}% of total budget`,
                    });
                }
            }

            // 3. Contract: cumulative invoices vs contract total
            // [trace: skill gutcheck-engine step 3 — flag if invoices exceed contract]
            for (const contract of project.contracts) {
                const contractTotal = contract.originalAmount +
                    contract.supplements.reduce((sum, s) => sum + s.amount, 0);

                const invoiceTotal = project.invoices
                    .filter((inv) => inv.contractId === contract.id)
                    .reduce((sum, inv) => sum + inv.totalAmount, 0);

                if (invoiceTotal > contractTotal && contractTotal > 0) {
                    const overAmount = invoiceTotal - contractTotal;
                    alerts.push({
                        type: "contract_overrun",
                        severity: "red",
                        entityId: contract.id,
                        entityName: `${contract.vendor} (${contract.contractNumber || contract.type})`,
                        message: `Invoices exceed contract by $${(overAmount / 100).toLocaleString()}`,
                    });
                }
            }

            return alerts;
        }),
});
