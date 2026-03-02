// server/lib/extraction/fieldMapper.ts
// Maps RawExtraction to IPC invoice schema fields
// [trace: comprehensive-prd.md §3.9 — field mapper]
import type { RawExtraction, MappedInvoice } from "./types.js";
import { computeOverallConfidence } from "./confidenceScorer.js";

/** Parse various date formats into ISO date string */
function normalizeDate(raw: string): string {
    if (!raw) return new Date().toISOString().split("T")[0];

    // Try MM/DD/YYYY
    const slashMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const [, m, d, y] = slashMatch;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // Try "Month DD, YYYY"
    const longMatch = raw.match(/([A-Z][a-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (longMatch) {
        const months: Record<string, string> = {
            January: "01", February: "02", March: "03", April: "04",
            May: "05", June: "06", July: "07", August: "08",
            September: "09", October: "10", November: "11", December: "12",
        };
        const [, month, day, year] = longMatch;
        const m = months[month] || "01";
        return `${year}-${m}-${day.padStart(2, "0")}`;
    }

    // Fallback: try native parsing
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
}

/** Convert dollars to cents (IPC stores amounts as integers in cents) */
function dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
}

export function mapExtractionToInvoice(extraction: RawExtraction): MappedInvoice {
    const { fields, lineItems } = extraction;
    const { level } = computeOverallConfidence(extraction);

    return {
        invoiceNumber: fields.invoiceNumber.value,
        vendor: fields.vendor.value,
        totalAmount: dollarsToCents(fields.totalAmount.value),
        dateReceived: normalizeDate(fields.date.value),
        lineItems: lineItems.map((li) => ({
            taskCode: li.taskCode.value,
            taskDescription: li.taskName.value,
            amount: dollarsToCents(li.currentDue.value),
        })),
        confidence: level,
    };
}
