import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";
import { getProvider, listProviders } from "../lib/extraction/providerRegistry.js";
import { mapExtractionToInvoice } from "../lib/extraction/fieldMapper.js";
import { computeOverallConfidence } from "../lib/extraction/confidenceScorer.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, like, desc } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

/**
 * Extraction router — PDF invoice parsing with provider-agnostic extraction.
 * [trace: comprehensive-prd.md §3.9 — PDF Invoice Parsing Engine]
 */
export const extractionRouter = router({
    /**
     * Extract invoice data from a PDF file.
     * Returns raw extraction + mapped fields for human review.
     * NEVER auto-saves — PM must confirm via invoices.create.
     */
    extractFromPdf: publicProcedure
        .input(
            z.object({
                pdfBase64: z.string(),
                fileName: z.string(),
                projectId: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const pdfBuffer = Buffer.from(input.pdfBase64, "base64");
            const provider = await getProvider();
            const extraction = await provider.extract(pdfBuffer);
            const mapped = mapExtractionToInvoice(extraction);
            const confidence = computeOverallConfidence(extraction);

            // Try to match extracted project name to existing projects
            let suggestedProjectId = input.projectId || null;
            if (!suggestedProjectId && extraction.fields.projectName.value) {
                const matchedProject = await db.query.projects.findFirst({
                    where: like(schema.projects.name, `%${extraction.fields.projectName.value.slice(0, 20)}%`),
                });
                if (matchedProject) suggestedProjectId = matchedProject.id;
            }

            const [draft] = await db
                .insert(schema.extractionDrafts)
                .values({
                    status: "pending",
                    fileName: input.fileName,
                    providerName: extraction.providerName,
                    projectId: suggestedProjectId,
                    extractedJson: JSON.stringify({
                        providerName: extraction.providerName,
                        fields: extraction.fields,
                        lineItems: extraction.lineItems,
                    }),
                    mappedJson: JSON.stringify(mapped),
                    overallConfidence: confidence.score,
                })
                .returning();

            return {
                draftId: draft.id,
                extraction: {
                    providerName: extraction.providerName,
                    fields: extraction.fields,
                    lineItems: extraction.lineItems,
                    // rawText omitted from response to reduce payload
                },
                mapped,
                confidence,
                suggestedProjectId,
            };
        }),

    /** List available extraction providers and their status */
    providers: publicProcedure.query(async () => {
        return listProviders();
    }),

    /**
     * Queue PDF files from a local folder into extraction drafts.
     * Text-PDF first: this uses the same provider flow as manual extraction.
     */
    enqueueFromFolder: publicProcedure
        .input(z.object({ folderPath: z.string() }))
        .mutation(async ({ input }) => {
            const files = await fs.readdir(input.folderPath, { withFileTypes: true });
            const pdfFiles = files
                .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf")
                .map((entry) => path.join(input.folderPath, entry.name));

            const provider = await getProvider();
            let queued = 0;
            for (const filePath of pdfFiles) {
                const buffer = await fs.readFile(filePath);
                const extraction = await provider.extract(buffer);
                const mapped = mapExtractionToInvoice(extraction);
                const confidence = computeOverallConfidence(extraction);

                await db.insert(schema.extractionDrafts).values({
                    status: "pending",
                    fileName: path.basename(filePath),
                    providerName: extraction.providerName,
                    extractedJson: JSON.stringify({
                        providerName: extraction.providerName,
                        fields: extraction.fields,
                        lineItems: extraction.lineItems,
                    }),
                    mappedJson: JSON.stringify(mapped),
                    overallConfidence: confidence.score,
                });
                queued++;
            }

            return { queued };
        }),

    listDrafts: publicProcedure
        .input(z.object({ status: z.enum(schema.EXTRACTION_DRAFT_STATUSES).optional() }).optional())
        .query(async ({ input }) => {
            return db.query.extractionDrafts.findMany({
                where: input?.status ? eq(schema.extractionDrafts.status, input.status) : undefined,
                with: {
                    project: true,
                    approvedInvoice: true,
                },
                orderBy: [desc(schema.extractionDrafts.id)],
            });
        }),

    /**
     * Human-reviewed approval: creates invoice + task breakdowns from draft.
     */
    approveDraft: publicProcedure
        .input(z.object({
            draftId: z.number(),
            mappedFields: z.object({
                projectId: z.number(),
                contractId: z.number().optional(),
                invoiceNumber: z.string().min(1),
                vendor: z.string().optional(),
                totalAmount: z.number(), // cents
                dateReceived: z.string().optional(),
                status: z.enum(schema.INVOICE_STATUSES).default("Received"),
                grantEligible: z.boolean().optional(),
                grantCode: z.string().optional(),
                taskBreakdowns: z.array(z.object({
                    budgetLineItemId: z.number(),
                    taskCode: z.string().optional(),
                    taskDescription: z.string().optional(),
                    amount: z.number(),
                })).default([]),
            }),
            reviewNotes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const draft = await db.query.extractionDrafts.findFirst({
                where: (d, { eq }) => eq(d.id, input.draftId),
            });
            if (!draft) throw new Error(`Draft ${input.draftId} not found`);
            if (draft.status === "approved" && draft.approvedInvoiceId) {
                return { invoiceId: draft.approvedInvoiceId };
            }

            const [invoice] = await db
                .insert(schema.invoices)
                .values({
                    projectId: input.mappedFields.projectId,
                    contractId: input.mappedFields.contractId,
                    invoiceNumber: input.mappedFields.invoiceNumber,
                    vendor: input.mappedFields.vendor,
                    totalAmount: input.mappedFields.totalAmount,
                    dateReceived: input.mappedFields.dateReceived,
                    status: input.mappedFields.status,
                    grantEligible: input.mappedFields.grantEligible ?? false,
                    grantCode: input.mappedFields.grantCode,
                })
                .returning();

            if (input.mappedFields.taskBreakdowns.length > 0) {
                await db.insert(schema.invoiceTaskBreakdown).values(
                    input.mappedFields.taskBreakdowns.map((tb) => ({
                        invoiceId: invoice.id,
                        budgetLineItemId: tb.budgetLineItemId,
                        taskCode: tb.taskCode,
                        taskDescription: tb.taskDescription,
                        amount: tb.amount,
                    })),
                );
            }

            await db
                .update(schema.extractionDrafts)
                .set({
                    status: "approved",
                    projectId: input.mappedFields.projectId,
                    approvedInvoiceId: invoice.id,
                    mappedJson: JSON.stringify(input.mappedFields),
                    reviewNotes: input.reviewNotes,
                    reviewedAt: new Date().toISOString(),
                })
                .where(eq(schema.extractionDrafts.id, input.draftId));

            // Feedback persistence for iterative tuning.
            const extracted = JSON.parse(draft.mappedJson);
            await db.insert(schema.extractionFeedback).values({
                invoiceId: invoice.id,
                fileName: draft.fileName,
                vendorDetected: String(extracted.vendor ?? ""),
                vendorCorrected: input.mappedFields.vendor ?? null,
                providerName: draft.providerName,
                extractedFields: JSON.stringify(extracted),
                correctedFields: JSON.stringify(input.mappedFields),
                overallConfidence: draft.overallConfidence ?? null,
                hadCorrections:
                    extracted.invoiceNumber !== input.mappedFields.invoiceNumber
                    || extracted.vendor !== input.mappedFields.vendor
                    || extracted.totalAmount !== input.mappedFields.totalAmount
                    || extracted.dateReceived !== input.mappedFields.dateReceived,
            });

            return { invoiceId: invoice.id };
        }),

    /**
     * Save extraction feedback — stores the diff between what was extracted and what the PM saved.
     * Called automatically when PM saves an extracted invoice.
     * [trace: comprehensive-prd.md §3.9 — feedback loop]
     */
    saveFeedback: publicProcedure
        .input(
            z.object({
                invoiceId: z.number().optional(),
                fileName: z.string(),
                providerName: z.string(),
                extractedFields: z.record(z.string(), z.any()), // What extraction proposed
                correctedFields: z.record(z.string(), z.any()), // What PM actually saved
                overallConfidence: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            // Determine if corrections were made
            const extracted = input.extractedFields;
            const corrected = input.correctedFields;
            const hadCorrections =
                extracted.invoiceNumber !== corrected.invoiceNumber ||
                extracted.vendor !== corrected.vendor ||
                extracted.totalAmount !== corrected.totalAmount ||
                extracted.dateReceived !== corrected.dateReceived;

            const [feedback] = await db
                .insert(schema.extractionFeedback)
                .values({
                    invoiceId: input.invoiceId ?? null,
                    fileName: input.fileName,
                    vendorDetected: String(extracted.vendor ?? ""),
                    vendorCorrected: hadCorrections ? String(corrected.vendor ?? "") : null,
                    providerName: input.providerName,
                    extractedFields: JSON.stringify(extracted),
                    correctedFields: JSON.stringify(corrected),
                    overallConfidence: input.overallConfidence ?? null,
                    hadCorrections,
                })
                .returning();

            return { feedbackId: feedback.id, hadCorrections };
        }),
});
