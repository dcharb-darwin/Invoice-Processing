// server/lib/extraction/types.ts
// Provider-agnostic PDF extraction types
// [trace: comprehensive-prd.md §3.9 — ExtractionProvider interface]

export interface ExtractionProvider {
    name: string;
    extract(pdfBuffer: Buffer, options?: ExtractionOptions): Promise<RawExtraction>;
    isAvailable(): Promise<boolean>;
}

export interface ExtractionOptions {
    pageRange?: { start: number; end: number };
    vendorHint?: string;
}

export interface ExtractedField<T> {
    value: T;
    confidence: number; // 0.0 - 1.0
    source: string;     // e.g. "regex:invoice_number_pattern" or "llm:field_extraction"
}

export interface ExtractedLineItem {
    taskCode: ExtractedField<string>;
    taskName: ExtractedField<string>;
    contractAmount: ExtractedField<number>;
    previousBilled: ExtractedField<number>;
    currentDue: ExtractedField<number>;
    confidence: number;
}

export interface RawExtraction {
    providerName: string;
    fields: {
        invoiceNumber: ExtractedField<string>;
        vendor: ExtractedField<string>;
        date: ExtractedField<string>;
        totalAmount: ExtractedField<number>;
        projectName: ExtractedField<string>;
        projectNumber: ExtractedField<string>;
    };
    lineItems: ExtractedLineItem[];
    rawText: string;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface MappedInvoice {
    invoiceNumber: string;
    vendor: string;
    totalAmount: number; // cents
    dateReceived: string; // ISO date
    lineItems: Array<{
        taskCode: string;
        taskDescription: string;
        amount: number; // cents
    }>;
    confidence: ConfidenceLevel;
}
