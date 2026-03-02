// server/lib/extraction/confidenceScorer.ts
// Computes confidence levels from raw extraction results
// [trace: comprehensive-prd.md §3.9 — confidence scoring]
import type { RawExtraction, ConfidenceLevel } from "./types.js";

export function getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 0.85) return "high";
    if (score >= 0.5) return "medium";
    return "low";
}

export function computeOverallConfidence(extraction: RawExtraction): {
    level: ConfidenceLevel;
    score: number;
    details: Record<string, { score: number; level: ConfidenceLevel }>;
} {
    const fields = extraction.fields;
    const scores: Record<string, number> = {
        invoiceNumber: fields.invoiceNumber.confidence,
        vendor: fields.vendor.confidence,
        date: fields.date.confidence,
        totalAmount: fields.totalAmount.confidence,
        projectName: fields.projectName.confidence,
    };

    // Weight: invoice# and total are most critical
    const weights: Record<string, number> = {
        invoiceNumber: 3,
        vendor: 2,
        date: 1,
        totalAmount: 3,
        projectName: 1,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    const details: Record<string, { score: number; level: ConfidenceLevel }> = {};

    for (const [key, score] of Object.entries(scores)) {
        const w = weights[key] || 1;
        weightedSum += score * w;
        totalWeight += w;
        details[key] = { score, level: getConfidenceLevel(score) };
    }

    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return { level: getConfidenceLevel(overallScore), score: overallScore, details };
}
