import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as XLSX from "xlsx";

export const exportRouter = router({
    projectToXlsx: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
                with: {
                    budgetLineItems: true,
                    fundingSources: true,
                    contracts: { with: { supplements: true } },
                    invoices: { with: { taskBreakdowns: true } },
                },
            });

            if (!project) {
                throw new Error(`Project ${input.projectId} not found`);
            }

            const wb = XLSX.utils.book_new();

            // 1. Overview sheet
            const overviewData = [
                { Name: project.name, CFP: project.cfpNumber ?? "", PM: project.projectManager ?? "", Type: project.type ?? "", Status: project.status ?? "" },
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), "Overview");

            // 2. Budget sheet — paidToDate is computed from invoice task breakdowns
            const budgetData = project.budgetLineItems.map((bli) => {
                const paidToDate = project.invoices
                    .flatMap((inv) => inv.taskBreakdowns)
                    .filter((tb) => tb.budgetLineItemId === bli.id)
                    .reduce((sum, tb) => sum + tb.amount, 0);

                return {
                    Category: bli.category,
                    Projected: bli.projectedCost / 100,
                    PaidToDate: paidToDate / 100,
                    Balance: (bli.projectedCost - paidToDate) / 100,
                };
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(budgetData), "Budget");

            // 3. Contracts sheet
            const contractsData = project.contracts.map((c) => ({
                Vendor: c.vendor,
                Type: c.type,
                OriginalAmount: c.originalAmount / 100,
                Supplements: c.supplements.reduce((sum, s) => sum + s.amount, 0) / 100,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contractsData), "Contracts");

            // 4. InvoiceLog sheet
            const invoiceData = project.invoices.map((inv) => ({
                InvoiceNumber: inv.invoiceNumber,
                Vendor: inv.vendor ?? "",
                Amount: inv.totalAmount / 100,
                Status: inv.status ?? "",
                Date: inv.dateReceived ?? "",
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceData), "InvoiceLog");

            const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
            return { base64: buf, fileName: `${project.name}.xlsx` };
        }),
});
