// server/lib/extraction/vendorTemplates/shannon-wilson.ts
// SW-specific regex patterns for invoice extraction
// [trace: comprehensive-prd.md §3.9 — vendor templates]
// Derived from SW-161983.pdf analysis

import type { VendorTemplate } from "./david-evans.js";

export const shannonWilsonTemplate: VendorTemplate = {
    name: "Shannon & Wilson",
    vendorPatterns: [
        /SHANNON\s*&?\s*WILSON/i,
        /Shannon\s*&\s*Wilson/i,
    ],
    invoiceNumberPattern: /Invoice\s*:?\s*(\d{5,7})/i,
    datePattern: /Invoice\s*Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    totalPattern: /(?:Amount\s+Due|Total\s+Due|Net\s+Amount)\s*[\s$]*([\d,]+\.\d{2})/i,
    // Matches: 100 - Project Management and Coordination  63,875.80  61,900.80  4,847.50  1,975.00  2,872.50
    lineItemPattern: /^(\d{3})\s*-?\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/gm,
    taskCodeFormat: "100, 200, 300",
};
