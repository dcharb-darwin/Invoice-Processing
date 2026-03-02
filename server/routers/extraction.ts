import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";
import { getProvider, listProviders } from "../lib/extraction/providerRegistry.js";
import { mapExtractionToInvoice } from "../lib/extraction/fieldMapper.js";
import { computeOverallConfidence } from "../lib/extraction/confidenceScorer.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { like } from "drizzle-orm";

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

            return {
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
