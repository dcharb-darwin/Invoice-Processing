import * as XLSX from "xlsx";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { router, publicProcedure } from "../trpc.js";

type ParsedFinanceRow = {
    projectName?: string;
    cfpNumber?: string;
    projectNumber?: string;
    budgetCode?: string;
    budgetAmount: number; // cents
    spentAmount: number; // cents
};

function moneyToCents(value: unknown): number {
    if (value == null || value === "") return 0;
    const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,]/g, ""));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
}

function parseFinanceRows(base64: string): ParsedFinanceRow[] {
    const wb = XLSX.read(base64, { type: "base64" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(ws, { defval: "" });

    return rows.map((row) => {
        const keys = Object.keys(row);
        const pick = (...patterns: RegExp[]) => {
            const key = keys.find((k) => patterns.some((p) => p.test(k.toLowerCase())));
            return key ? row[key] : undefined;
        };
        return {
            projectName: String(pick(/project name/, /project/) ?? "").trim() || undefined,
            cfpNumber: String(pick(/^cfp$/, /cfp #/, /cfp number/) ?? "").trim() || undefined,
            projectNumber: String(pick(/project #/, /project number/, /^project id$/) ?? "").trim() || undefined,
            budgetCode: String(pick(/budget code/, /springbrook/, /account/) ?? "").trim() || undefined,
            budgetAmount: moneyToCents(pick(/budget/, /allocated/)),
            spentAmount: moneyToCents(pick(/spent/, /actual/, /paid/)),
        };
    }).filter((row) => row.projectName || row.cfpNumber || row.projectNumber || row.budgetCode);
}

export const financeReconciliationRouter = router({
    importSnapshot: publicProcedure
        .input(z.object({ base64: z.string(), fileName: z.string() }))
        .mutation(async ({ input }) => {
            const parsedRows = parseFinanceRows(input.base64);

            const [snapshot] = await db
                .insert(schema.financeTrackerSnapshots)
                .values({
                    fileName: input.fileName,
                    parsedProjects: parsedRows.length,
                    rawJson: JSON.stringify(parsedRows),
                })
                .returning();

            const matchedProjectIds = new Set<number>();
            const deltas: typeof schema.financeDeltaItems.$inferInsert[] = [];

            for (const row of parsedRows) {
                const project = await db.query.projects.findFirst({
                    where: (p, { or, and: a, eq: e, like }) => or(
                        row.cfpNumber ? e(p.cfpNumber, row.cfpNumber) : undefined,
                        row.projectNumber ? e(p.projectNumber, row.projectNumber) : undefined,
                        row.projectName ? like(p.name, `%${row.projectName.slice(0, 24)}%`) : undefined,
                    ),
                });

                if (!project) {
                    deltas.push({
                        snapshotId: snapshot.id,
                        cfpNumber: row.cfpNumber,
                        projectNumber: row.projectNumber,
                        budgetCode: row.budgetCode,
                        category: "missing_in_ipc",
                        severity: "high",
                        deltaAmount: row.spentAmount,
                        message: `Finance row not found in IPC: ${row.projectName ?? row.cfpNumber ?? row.projectNumber ?? "unknown project"}`,
                    });
                    continue;
                }

                matchedProjectIds.add(project.id);

                const fullProject = await db.query.projects.findFirst({
                    where: eq(schema.projects.id, project.id),
                    with: { fundingSources: true, invoices: true },
                });
                if (!fullProject) continue;

                const ipcBudget = fullProject.fundingSources.reduce((sum, fs) => sum + fs.allocatedAmount, 0);
                const ipcSpent = fullProject.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                const deltaAmount = ipcSpent - row.spentAmount;

                if (row.budgetCode) {
                    const hasCode = fullProject.fundingSources.some((fs) => fs.springbrookBudgetCode === row.budgetCode);
                    if (!hasCode) {
                        deltas.push({
                            snapshotId: snapshot.id,
                            projectId: project.id,
                            cfpNumber: row.cfpNumber ?? project.cfpNumber,
                            projectNumber: row.projectNumber ?? project.projectNumber,
                            budgetCode: row.budgetCode,
                            category: "code_mismatch",
                            severity: "high",
                            deltaAmount: 0,
                            message: `Budget code ${row.budgetCode} exists in finance snapshot but not in IPC funding sources.`,
                        });
                    }
                }

                if (ipcSpent > ipcBudget && ipcBudget > 0) {
                    deltas.push({
                        snapshotId: snapshot.id,
                        projectId: project.id,
                        cfpNumber: row.cfpNumber ?? project.cfpNumber,
                        projectNumber: row.projectNumber ?? project.projectNumber,
                        budgetCode: row.budgetCode,
                        category: "budget_overrun_risk",
                        severity: "high",
                        deltaAmount: ipcSpent - ipcBudget,
                        message: `IPC spent exceeds IPC budget for project ${project.name}.`,
                    });
                }

                if (Math.abs(deltaAmount) >= 5_000) {
                    deltas.push({
                        snapshotId: snapshot.id,
                        projectId: project.id,
                        cfpNumber: row.cfpNumber ?? project.cfpNumber,
                        projectNumber: row.projectNumber ?? project.projectNumber,
                        budgetCode: row.budgetCode,
                        category: "expected_payment_lag",
                        severity: Math.abs(deltaAmount) >= 50_000 ? "high" : "medium",
                        deltaAmount,
                        message: `IPC spent and finance spent differ by ${deltaAmount / 100}.`,
                    });
                }
            }

            const projects = await db.query.projects.findMany();
            for (const project of projects) {
                if (matchedProjectIds.has(project.id)) continue;
                deltas.push({
                    snapshotId: snapshot.id,
                    projectId: project.id,
                    cfpNumber: project.cfpNumber,
                    projectNumber: project.projectNumber,
                    category: "missing_in_finance",
                    severity: "medium",
                    deltaAmount: 0,
                    message: `IPC project missing from finance snapshot: ${project.name}`,
                });
            }

            if (deltas.length > 0) {
                await db.insert(schema.financeDeltaItems).values(deltas);
            }

            return {
                snapshotId: snapshot.id,
                parsedProjects: parsedRows.length,
            };
        }),

    deltaReport: publicProcedure
        .input(z.object({ snapshotId: z.number().optional() }).optional())
        .query(async ({ input }) => {
            const snapshotId = input?.snapshotId
                ?? (await db.query.financeTrackerSnapshots.findFirst({
                    orderBy: [desc(schema.financeTrackerSnapshots.id)],
                }))?.id;
            if (!snapshotId) {
                return {
                    summary: {
                        snapshotId: null,
                        total: 0,
                        byCategory: {},
                    },
                    items: [],
                };
            }

            const items = await db.query.financeDeltaItems.findMany({
                where: eq(schema.financeDeltaItems.snapshotId, snapshotId),
                orderBy: [desc(schema.financeDeltaItems.id)],
                with: {
                    project: true,
                },
            });

            const byCategory: Record<string, number> = {};
            for (const item of items) {
                byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
            }

            return {
                summary: {
                    snapshotId,
                    total: items.length,
                    byCategory,
                },
                items,
            };
        }),
});
