// server/lib/extraction/vendorTemplates/david-evans.ts
// DEA-specific regex patterns for invoice extraction
// [trace: comprehensive-prd.md §3.9 — vendor templates]
// Derived from DEA-599518.pdf analysis

export interface VendorTemplate {
    name: string;
    vendorPatterns: RegExp[];
    invoiceNumberPattern: RegExp;
    datePattern: RegExp;
    totalPattern: RegExp;
    lineItemPattern: RegExp;
    taskCodeFormat: string;
}

export const davidEvansTemplate: VendorTemplate = {
    name: "David Evans and Associates",
    vendorPatterns: [
        /DAVID\s+EVANS/i,
        /David Evans and Associates/i,
    ],
    invoiceNumberPattern: /Invoice\s*Number\s*:?\s*(\d+)/i,
    datePattern: /Invoice\s*Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},?\s*\d{4})/i,
    totalPattern: /(?:Subtotal|Total)\s*[\s$]*([\d,]+\.\d{2})/i,
    // Matches: 001  Project Management  93,279.04  5,792.43  7,665.52  8.22%  1,873.09
    lineItemPattern: /^((?:SUB)?\d{2,3})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+[\d.]+%\s+([\d,]+\.\d{2})/gm,
    taskCodeFormat: "001, 003, SUB01",
};
