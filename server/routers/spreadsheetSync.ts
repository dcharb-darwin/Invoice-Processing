import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { router, publicProcedure } from "../trpc.js";
import {
    detectWorkbookFormat,
    exportUnifiedWorkbook,
    parseUnifiedWorkbook,
    validateUnifiedWorkbook,
    workbookHash,
} from "../lib/spreadsheetSync/unifiedWorkbook.js";
import { findOrCreateBli } from "../lib/budgetLineItems.js";

type ValidationCache = {
    token: string;
    createdAt: number;
    format: string;
    workbookHash: string;
    criticalIssues: Array<{ code: string; severity: "critical" | "warning"; message: string; tab?: string }>;
    warnings: Array<{ code: string; severity: "critical" | "warning"; message: string; tab?: string }>;
};

const validationCache = new Map<string, ValidationCache>();
const VALIDATION_TTL_MS = 15 * 60 * 1000;

function cleanupValidationCache() {
    const now = Date.now();
    for (const [key, value] of validationCache.entries()) {
        if (now - value.createdAt > VALIDATION_TTL_MS) {
            validationCache.delete(key);
        }
    }
}

export const spreadsheetSyncRouter = router({
    detectFormat: publicProcedure
        .input(z.object({ base64: z.string(), fileName: z.string().optional() }))
        .mutation(({ input }) => {
            return detectWorkbookFormat(input.base64);
        }),

    validate: publicProcedure
        .input(z.object({ base64: z.string(), projectId: z.number().optional() }))
        .mutation(async ({ input }) => {
            cleanupValidationCache();
            const detected = detectWorkbookFormat(input.base64);
            const token = randomUUID();
            let criticalIssues: ValidationCache["criticalIssues"] = [];
            let warnings: ValidationCache["warnings"] = [];

            let projectUpdatedAt: string | undefined;
            if (input.projectId) {
                const project = await db.query.projects.findFirst({
                    where: eq(schema.projects.id, input.projectId),
                });
                projectUpdatedAt = project?.updatedAt;
            }

            if (detected.format === "unified_v1") {
                const validated = validateUnifiedWorkbook(input.base64, projectUpdatedAt);
                criticalIssues = validated.criticalIssues;
                warnings = validated.warnings;
            } else if (detected.format === "unknown") {
                criticalIssues = [{
                    code: "unknown_format",
                    severity: "critical",
                    message: "Workbook format could not be recognized.",
                }];
            } else {
                warnings = [{
                    code: "legacy_format_detected",
                    severity: "warning",
                    message: "Legacy workbook detected. Use legacy import endpoint or convert to unified format.",
                }];
            }

            const wHash = workbookHash(input.base64);
            validationCache.set(token, {
                token,
                createdAt: Date.now(),
                format: detected.format,
                workbookHash: wHash,
                criticalIssues,
                warnings,
            });

            await db.insert(schema.spreadsheetSyncEvents).values({
                projectId: input.projectId ?? null,
                eventType: "validate",
                format: detected.format,
                workbookHash: wHash,
                validationToken: token,
                criticalCount: criticalIssues.length,
                warningCount: warnings.length,
                detailsJson: JSON.stringify({
                    sheetNames: detected.sheetNames,
                    confidence: detected.confidence,
                    criticalIssues,
                    warnings,
                }),
            });

            return {
                validationToken: token,
                format: detected.format,
                criticalIssues,
                warnings,
                deltaSummary: {
                    criticalCount: criticalIssues.length,
                    warningCount: warnings.length,
                },
            };
        }),

    import: publicProcedure
        .input(z.object({
            base64: z.string(),
            projectId: z.number(),
            validationToken: z.string(),
        }))
        .mutation(async ({ input }) => {
            cleanupValidationCache();
            const cached = validationCache.get(input.validationToken);
            if (!cached) {
                throw new Error("Validation token not found or expired. Re-run validation.");
            }
            if (Date.now() - cached.createdAt > VALIDATION_TTL_MS) {
                validationCache.delete(input.validationToken);
                throw new Error("Validation token expired. Re-run validation.");
            }
            const incomingHash = workbookHash(input.base64);
            if (incomingHash !== cached.workbookHash) {
                throw new Error("Workbook changed after validation. Re-run validation.");
            }
            if (cached.criticalIssues.length > 0) {
                throw new Error("Import blocked by critical validation issues.");
            }

            if (cached.format !== "unified_v1") {
                throw new Error("Gated import currently supports unified_v1 workbooks only. Use legacy import routes for Eric/Shannon formats.");
            }

            const parsed = parseUnifiedWorkbook(input.base64);
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
            });
            if (!project) throw new Error(`Project ${input.projectId} not found`);

            // Update project metadata from workbook overview where present.
            await db
                .update(schema.projects)
                .set({
                    name: parsed.overview.name ?? project.name,
                    cfpNumber: parsed.overview.cfpNumber ?? project.cfpNumber,
                    projectNumber: parsed.overview.projectNumber ?? project.projectNumber,
                    type: (parsed.overview.projectType as schema.ProjectType | undefined) ?? project.type,
                    projectManager: parsed.overview.projectManager ?? project.projectManager,
                    councilAuthDate: parsed.overview.councilAuthDate ?? project.councilAuthDate,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(schema.projects.id, input.projectId));

            // Replace funding sources and ROW parcels from unified workbook.
            await db.delete(schema.fundingSources).where(eq(schema.fundingSources.projectId, input.projectId));
            if (parsed.fundingSources.length > 0) {
                await db.insert(schema.fundingSources).values(parsed.fundingSources.map((s) => ({
                    projectId: input.projectId,
                    sourceName: s.sourceName,
                    springbrookBudgetCode: s.springbrookBudgetCode,
                    allocatedAmount: s.allocatedAmount,
                    yearAllocations: s.yearAllocations,
                })));
            }

            await db.delete(schema.rowParcels).where(eq(schema.rowParcels.projectId, input.projectId));
            if (parsed.rowParcels.length > 0) {
                await db.insert(schema.rowParcels).values(parsed.rowParcels.map((p) => ({
                    projectId: input.projectId,
                    parcelNumber: p.parcelNumber,
                    expenditureType: p.expenditureType,
                    amount: p.amount,
                })));
            }

            let contractsUpserted = 0;
            let invoicesUpserted = 0;
            let taskBreakdownsUpserted = 0;

            for (const contract of parsed.contracts) {
                let existing = contract.contractNumber
                    ? await db.query.contracts.findFirst({
                        where: and(
                            eq(schema.contracts.projectId, input.projectId),
                            eq(schema.contracts.type, contract.type),
                            eq(schema.contracts.contractNumber, contract.contractNumber),
                        ),
                    })
                    : undefined;

                if (!existing && contract.vendor) {
                    existing = await db.query.contracts.findFirst({
                        where: and(
                            eq(schema.contracts.projectId, input.projectId),
                            eq(schema.contracts.type, contract.type),
                            eq(schema.contracts.vendor, contract.vendor),
                        ),
                    });
                }

                let contractId: number;
                if (existing) {
                    const [updated] = await db
                        .update(schema.contracts)
                        .set({
                            vendor: contract.vendor || existing.vendor,
                            contractNumber: contract.contractNumber,
                            originalAmount: contract.originalAmount,
                            signedDocumentLink: contract.signedDocumentLink,
                        })
                        .where(eq(schema.contracts.id, existing.id))
                        .returning();
                    contractId = updated.id;
                } else {
                    const [created] = await db
                        .insert(schema.contracts)
                        .values({
                            projectId: input.projectId,
                            vendor: contract.vendor || `${contract.type} Vendor`,
                            contractNumber: contract.contractNumber,
                            type: contract.type,
                            originalAmount: contract.originalAmount,
                            signedDocumentLink: contract.signedDocumentLink,
                        })
                        .returning();
                    contractId = created.id;
                }
                contractsUpserted++;

                for (const invoice of contract.invoices) {
                    let existingInvoice = await db.query.invoices.findFirst({
                        where: and(
                            eq(schema.invoices.projectId, input.projectId),
                            eq(schema.invoices.invoiceNumber, invoice.invoiceNumber),
                        ),
                    });

                    let invoiceId: number;
                    if (existingInvoice) {
                        const [updated] = await db
                            .update(schema.invoices)
                            .set({
                                contractId,
                                vendor: invoice.vendor,
                                totalAmount: invoice.totalAmount,
                                dateReceived: invoice.dateReceived,
                                dateApproved: invoice.dateApproved,
                                status: invoice.status,
                                grantEligible: invoice.grantEligible ?? false,
                                grantCode: invoice.grantCode,
                                sourcePdfPath: invoice.sourcePdfPath,
                                signedPdfPath: invoice.signedPdfPath,
                            })
                            .where(eq(schema.invoices.id, existingInvoice.id))
                            .returning();
                        invoiceId = updated.id;
                    } else {
                        const [created] = await db
                            .insert(schema.invoices)
                            .values({
                                projectId: input.projectId,
                                contractId,
                                invoiceNumber: invoice.invoiceNumber,
                                vendor: invoice.vendor,
                                totalAmount: invoice.totalAmount,
                                dateReceived: invoice.dateReceived,
                                dateApproved: invoice.dateApproved,
                                status: invoice.status ?? "Received",
                                grantEligible: invoice.grantEligible ?? false,
                                grantCode: invoice.grantCode,
                                sourcePdfPath: invoice.sourcePdfPath,
                                signedPdfPath: invoice.signedPdfPath,
                            })
                            .returning();
                        invoiceId = created.id;
                    }
                    invoicesUpserted++;

                    await db.delete(schema.invoiceTaskBreakdown).where(eq(schema.invoiceTaskBreakdown.invoiceId, invoiceId));
                    if (invoice.taskBreakdowns.length > 0) {
                        const rows: Array<typeof schema.invoiceTaskBreakdown.$inferInsert> = [];
                        for (const tb of invoice.taskBreakdowns) {
                            let budgetLineItemId: number | null = null;
                            if (tb.budgetCategory) {
                                budgetLineItemId = await findOrCreateBli(input.projectId, tb.budgetCategory);
                            }
                            rows.push({
                                invoiceId,
                                budgetLineItemId,
                                taskCode: tb.taskCode,
                                taskDescription: tb.taskDescription,
                                amount: tb.amount,
                            });
                        }
                        await db.insert(schema.invoiceTaskBreakdown).values(rows);
                        taskBreakdownsUpserted += rows.length;
                    }
                }
            }

            const [event] = await db
                .insert(schema.spreadsheetSyncEvents)
                .values({
                    projectId: input.projectId,
                    eventType: "import",
                    format: cached.format,
                    workbookHash: cached.workbookHash,
                    validationToken: input.validationToken,
                    criticalCount: cached.criticalIssues.length,
                    warningCount: cached.warnings.length,
                    detailsJson: JSON.stringify({
                        contractsUpserted,
                        invoicesUpserted,
                        taskBreakdownsUpserted,
                    }),
                    appliedAt: new Date().toISOString(),
                })
                .returning();

            return {
                syncEventId: event.id,
                upserts: {
                    contracts: contractsUpserted,
                    invoices: invoicesUpserted,
                    taskBreakdowns: taskBreakdownsUpserted,
                },
                warnings: cached.warnings,
            };
        }),

    exportUnified: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
                with: {
                    fundingSources: true,
                    rowParcels: true,
                    budgetLineItems: true,
                    contracts: { with: { supplements: true } },
                    invoices: { with: { taskBreakdowns: true } },
                },
            });
            if (!project) throw new Error(`Project ${input.projectId} not found`);

            const exported = exportUnifiedWorkbook(project);
            await db.insert(schema.spreadsheetSyncEvents).values({
                projectId: input.projectId,
                eventType: "export",
                format: "unified_v1",
                workbookHash: exported.workbookHash,
                criticalCount: 0,
                warningCount: 0,
                detailsJson: JSON.stringify({
                    formatVersion: exported.formatVersion,
                    fileName: exported.fileName,
                }),
                appliedAt: new Date().toISOString(),
            });

            return exported;
        }),

    roundTripCheck: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
                with: {
                    fundingSources: true,
                    rowParcels: true,
                    budgetLineItems: true,
                    contracts: { with: { supplements: true } },
                    invoices: { with: { taskBreakdowns: true } },
                },
            });
            if (!project) throw new Error(`Project ${input.projectId} not found`);

            const exported = exportUnifiedWorkbook(project);
            const validated = validateUnifiedWorkbook(exported.base64, project.updatedAt);
            const pass = validated.criticalIssues.length === 0;

            const latestImport = await db.query.spreadsheetSyncEvents.findFirst({
                where: and(
                    eq(schema.spreadsheetSyncEvents.projectId, input.projectId),
                    eq(schema.spreadsheetSyncEvents.eventType, "import"),
                ),
                orderBy: [desc(schema.spreadsheetSyncEvents.id)],
            });

            return {
                pass,
                differences: {
                    criticalIssues: validated.criticalIssues,
                    warnings: validated.warnings,
                    lastImportHash: latestImport?.workbookHash ?? null,
                    currentExportHash: exported.workbookHash,
                },
            };
        }),
});
