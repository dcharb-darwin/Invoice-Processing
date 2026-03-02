// server/lib/extraction/providers/localProvider.ts
// MVP extraction provider using pdf-parse + regex
// [trace: comprehensive-prd.md §3.9 — LocalProvider]
// Regex patterns tuned against actual pdf-parse v1.1.1 output from DEA-599518 and SW-161983
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import type { ExtractionProvider, RawExtraction, ExtractedField, ExtractedLineItem, ExtractionOptions } from "../types.js";
import { davidEvansTemplate, type VendorTemplate } from "../vendorTemplates/david-evans.js";
import { shannonWilsonTemplate } from "../vendorTemplates/shannon-wilson.js";

const templates: VendorTemplate[] = [davidEvansTemplate, shannonWilsonTemplate];

function field<T>(value: T, confidence: number, source: string): ExtractedField<T> {
    return { value, confidence, source };
}

function detectVendor(text: string): VendorTemplate | null {
    for (const t of templates) {
        if (t.vendorPatterns.some(p => p.test(text))) return t;
    }
    return null;
}

function parseAmount(s: string): number {
    return parseFloat(s.replace(/,/g, ""));
}

export class LocalProvider implements ExtractionProvider {
    name = "local-pdf-parse";

    async isAvailable(): Promise<boolean> { return true; }

    async extract(pdfBuffer: Buffer, _options?: ExtractionOptions): Promise<RawExtraction> {
        const { text } = await pdfParse(pdfBuffer);
        const template = detectVendor(text);
        const isDEA = template?.name.includes("David Evans") ?? false;
        const isSW = template?.name.includes("Shannon") ?? false;

        // Invoice number — pdf-parse may concatenate: "InvoiceNumber599518" or "Invoice : 161983"
        let invoiceNumber: ExtractedField<string>;
        const invMatch = text.match(/Invoice\s*(?:Number|#|No\.?)?\s*:?\s*(\d{5,7})/i);
        invoiceNumber = invMatch
            ? field(invMatch[1], 0.9, "regex:invoice_number")
            : field("", 0.3, "regex:invoice_number:no_match");

        // Vendor — use template match if available
        const vendor = template
            ? field(template.name, 0.95, "regex:vendor_template_match")
            : field(text.split("\n").slice(0, 5).find((l: string) => l.trim().length > 3)?.trim() || "", 0.4, "heuristic:first_lines");

        // Date — different formats
        let date: ExtractedField<string>;
        const dateMatch1 = text.match(/Invoice\s*Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},?\s*\d{4})/i);
        const dateMatch2 = text.match(/Invoice\s*Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        date = dateMatch1 ? field(dateMatch1[1], 0.9, "regex:date_long")
            : dateMatch2 ? field(dateMatch2[1], 0.9, "regex:date_slash")
                : field("", 0.3, "regex:date:no_match");

        // Total — look for Invoice Total, Amount Due, or Subtotal line
        let totalAmount: ExtractedField<number>;
        // DEA: "Invoice Total" followed by amount, or "Subtotal" line with "12,553.11"
        // SW: "Amount Due This Bill15,286.00" (no space before amount)
        const totalMatch = text.match(/Invoice\s*Total\s*\n?\s*\$?\s*([\d,]+\.\d{2})/i)
            || text.match(/Amount\s*Due\s*(?:This\s*Bill)?\s*\$?\s*([\d,]+\.\d{2})/i)
            || text.match(/Current\s*Billings\s*([\d,]+\.\d{2})/i)
            || text.match(/Subtotal\s+(?:[\d.]+%\s*)?\s*([\d,]+\.\d{2})/i);
        totalAmount = totalMatch
            ? field(parseAmount(totalMatch[1]), 0.9, "regex:total")
            : field(0, 0.2, "regex:total:no_match");

        // Project name
        const projectMatch = text.match(/Project\s*(?:Name)?\s*:?\s*(.+?)(?:\n|$)/i);
        const projectName = projectMatch
            ? field(projectMatch[1].trim(), 0.7, "regex:project_name")
            : field("", 0.2, "regex:project_name:no_match");

        // Project number
        const projectNumMatch = text.match(/Project\s*:?\s*([A-Z0-9\-]+\d)/i);
        const projectNumber = projectNumMatch
            ? field(projectNumMatch[1], 0.7, "regex:project_number")
            : field("", 0.2, "regex:project_number:no_match");

        // Line items — different parsing strategies per vendor
        const lineItems: ExtractedLineItem[] = [];
        const lines = text.split("\n");

        if (isDEA) {
            // DEA format: "001Project Management 5,792.43 7,665.52 1,873.09 8.22%"
            // Contract Amount appears on next line: "93,279.04"
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Match: code + name + numbers
                const m = line.match(/^((?:SUB)?\d{2,3})([A-Za-z].+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d.]+%)/);
                if (m) {
                    // Next line has contract amount
                    const nextLine = lines[i + 1]?.trim() || "";
                    const contractMatch = nextLine.match(/^([\d,]+\.\d{2})$/);
                    const contractAmt = contractMatch ? parseAmount(contractMatch[1]) : 0;

                    lineItems.push({
                        taskCode: field(m[1], 0.95, "regex:dea_task_code"),
                        taskName: field(m[2].trim(), 0.85, "regex:dea_task_name"),
                        contractAmount: field(contractAmt, contractAmt > 0 ? 0.85 : 0.4, "regex:dea_contract_amt"),
                        previousBilled: field(parseAmount(m[3]), 0.85, "regex:dea_prev_billed"),
                        currentDue: field(parseAmount(m[5]), 0.9, "regex:dea_current_due"),
                        confidence: 0.88,
                    });
                }
            }
        } else if (isSW) {
            // SW format: "100 - Project Management and Coordination63,875.8061,900.804,847.501,975.002,872.50"
            // Amounts concatenated without spaces — use greedy match from end
            for (const line of lines) {
                const m = line.match(/^(\d{3,4})\s*-\s*(.+?)([\d,]+\.\d{2})([\d,]+\.\d{2})([\d,]+\.\d{2})([\d,]+\.\d{2})([\d,]+\.\d{2})\s*$/);
                if (m) {
                    lineItems.push({
                        taskCode: field(m[1], 0.95, "regex:sw_task_code"),
                        taskName: field(m[2].trim(), 0.85, "regex:sw_task_name"),
                        contractAmount: field(parseAmount(m[3]), 0.85, "regex:sw_fee"),
                        previousBilled: field(parseAmount(m[6]), 0.85, "regex:sw_previous"),
                        currentDue: field(parseAmount(m[7]), 0.9, "regex:sw_current"),
                        confidence: 0.88,
                    });
                }
            }
        }

        return {
            providerName: this.name,
            fields: { invoiceNumber, vendor, date, totalAmount, projectName, projectNumber },
            lineItems,
            rawText: text,
        };
    }
}
