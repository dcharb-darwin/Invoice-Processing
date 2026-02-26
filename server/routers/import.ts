import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import * as XLSX from "xlsx";

/**
 * Import router — parse Eric and Shannon xlsx spreadsheets into the data model.
 * [trace: skill xlsx-eric-parser, xlsx-shannon-parser]
 * [trace: discovery L356-391 — Eric's 18013_Budget multi-tab format]
 * [trace: discovery L469-476 — Shannon's BTR Expense Tracking Worksheet]
 */

// ============================================================
// Shared helpers
// ============================================================

/** Convert a dollar value to cents (integer) */
function toCents(val: unknown): number {
    if (val == null || val === "") return 0;
    const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[$,]/g, ""));
    return isNaN(n) ? 0 : Math.round(n * 100);
}

/** Safely extract a trimmed string from a cell */
function cellStr(val: unknown): string | undefined {
    if (val == null || val === "") return undefined;
    return String(val).trim();
}

/** Parse an Excel date (serial number or string) to ISO date string */
function parseDate(val: unknown): string | undefined {
    if (val == null || val === "") return undefined;
    if (typeof val === "number") {
        const d = XLSX.SSF.parse_date_code(val);
        if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    return String(val).trim();
}

/** Budget categories auto-generated per contract type (mirrors contracts.ts) */
const CONTRACT_TYPE_TO_BUDGET_CATEGORIES: Record<string, { category: string }[]> = {
    Design: [{ category: "Design" }, { category: "Permitting" }],
    CM_Services: [{ category: "CM_Services" }, { category: "Inspector_Material" }],
    Construction: [{ category: "Construction" }, { category: "Misc" }],
};

/** Ensure budget line items exist for a contract type */
async function ensureBudgetLineItems(projectId: number, contractType: string): Promise<void> {
    const categories = CONTRACT_TYPE_TO_BUDGET_CATEGORIES[contractType] || [];
    for (const cat of categories) {
        const existing = await db.query.budgetLineItems.findFirst({
            where: (bli, { and: a, eq: e }) =>
                a(e(bli.projectId, projectId), e(bli.category, cat.category as any)),
        });
        if (!existing) {
            await db.insert(schema.budgetLineItems).values({
                projectId,
                category: cat.category as any,
                projectedCost: 0,
                percentScopeComplete: 0,
            });
        }
    }
}

// ============================================================
// Eric parser helpers
// ============================================================

interface ParsedContractTab {
    vendor?: string;
    contractNumber?: string;
    originalAmount: number;
    signedDocumentLink?: string;
    supplements: { supplementNumber: number; amount: number; date?: string; description?: string }[];
    invoices: { invoiceNumber: string; totalAmount: number; dateReceived?: string; vendor?: string }[];
}

function parseEricContractTab(ws: XLSX.WorkSheet): ParsedContractTab {
    const result: ParsedContractTab = {
        originalAmount: 0,
        supplements: [],
        invoices: [],
    };

    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    // Scan top rows for contract metadata
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const label = String(row[0] ?? "").toLowerCase().trim();

        if (label.includes("vendor") || label.includes("consultant") || label.includes("contractor")) {
            result.vendor = cellStr(row[1]);
        }
        if (label.includes("contract") && (label.includes("number") || label.includes("#") || label.includes("no"))) {
            result.contractNumber = cellStr(row[1]);
        }
        if (label.includes("original") && (label.includes("amount") || label.includes("contract"))) {
            result.originalAmount = toCents(row[1]);
        }
        if (label.includes("signed") || (label.includes("document") && label.includes("link"))) {
            result.signedDocumentLink = cellStr(row[1]);
        }
        // Supplement rows: "Supplement 1", "Supplement #2", etc.
        const suppMatch = label.match(/supplement\s*#?\s*(\d+)/);
        if (suppMatch) {
            result.supplements.push({
                supplementNumber: parseInt(suppMatch[1]),
                amount: toCents(row[1]),
                date: parseDate(row[2]),
                description: cellStr(row[3]),
            });
        }
    }

    // Find invoice log header row
    let invoiceHeaderIdx = -1;
    const colMap: Record<string, number> = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const headers = row.map((c) => String(c ?? "").toLowerCase().trim());

        if (headers.some((h) => h.includes("invoice") && (h.includes("number") || h.includes("#") || h.includes("no")))) {
            invoiceHeaderIdx = i;
            headers.forEach((h, j) => {
                if (h.includes("invoice") && (h.includes("number") || h.includes("#") || h.includes("no"))) colMap.invoiceNumber = j;
                if (h.includes("amount") && !colMap.amount) colMap.amount = j;
                if (h.includes("date") && !h.includes("approved")) colMap.dateReceived = j;
                if (h.includes("vendor")) colMap.vendor = j;
            });
            break;
        }
    }

    if (invoiceHeaderIdx >= 0) {
        for (let i = invoiceHeaderIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;

            const invNum = cellStr(row[colMap.invoiceNumber ?? 0]);
            if (!invNum) continue;

            result.invoices.push({
                invoiceNumber: invNum,
                totalAmount: toCents(row[colMap.amount ?? 1]),
                dateReceived: parseDate(row[colMap.dateReceived ?? 2]),
                vendor: cellStr(row[colMap.vendor ?? -1]) ?? result.vendor,
            });
        }
    }

    return result;
}

/** Parse Eric's ROW tab for parcel data */
function parseEricROWTab(ws: XLSX.WorkSheet): { parcelNumber: string; expenditureType?: string; amount: number }[] {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const parcels: { parcelNumber: string; expenditureType?: string; amount: number }[] = [];

    let headerIdx = -1;
    const colMap: Record<string, number> = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const headers = row.map((c) => String(c ?? "").toLowerCase().trim());

        if (headers.some((h) => h.includes("parcel"))) {
            headerIdx = i;
            headers.forEach((h, j) => {
                if (h.includes("parcel")) colMap.parcel = j;
                if (h.includes("expenditure") || h.includes("type")) colMap.type = j;
                if (h.includes("amount") || h.includes("cost")) colMap.amount = j;
            });
            break;
        }
    }

    if (headerIdx >= 0) {
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;

            const parcelNum = cellStr(row[colMap.parcel ?? 0]);
            if (!parcelNum) continue;

            parcels.push({
                parcelNumber: parcelNum,
                expenditureType: cellStr(row[colMap.type ?? 1]),
                amount: toCents(row[colMap.amount ?? 2]),
            });
        }
    }

    return parcels;
}

/** Parse Eric's Overview tab for project metadata and budget codes */
function parseEricOverview(ws: XLSX.WorkSheet): {
    name?: string;
    cfpNumber?: string;
    projectNumber?: string;
    councilAuthDate?: string;
    budgetCodes: { code: string; description?: string }[];
} {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const result: {
        name?: string;
        cfpNumber?: string;
        projectNumber?: string;
        councilAuthDate?: string;
        budgetCodes: { code: string; description?: string }[];
    } = { budgetCodes: [] };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const label = String(row[0] ?? "").toLowerCase().trim();

        if (label.includes("project") && label.includes("name")) {
            result.name = cellStr(row[1]);
        } else if (label.includes("cfp")) {
            result.cfpNumber = cellStr(row[1]);
        } else if (label.includes("project") && (label.includes("number") || label.includes("#") || label.includes("no"))) {
            result.projectNumber = cellStr(row[1]);
        } else if (label.includes("council") && (label.includes("auth") || label.includes("date"))) {
            result.councilAuthDate = parseDate(row[1]);
        } else if (label.includes("springbrook") || label.includes("budget code")) {
            const code = cellStr(row[1]);
            if (code) {
                result.budgetCodes.push({ code, description: cellStr(row[2]) });
            }
        }
    }

    // Fallback: first non-empty cell as project name
    if (!result.name && rows.length > 0) {
        const firstVal = cellStr(rows[0]?.[0]);
        if (firstVal && !firstVal.toLowerCase().includes("overview")) {
            result.name = firstVal;
        }
    }

    return result;
}

// ============================================================
// Shannon parser helpers
// ============================================================

const CATEGORY_MAP: Record<string, string> = {
    design: "Design",
    inspector: "Inspector_Material",
    material: "Inspector_Material",
    permitting: "Permitting",
    misc: "Misc",
    cm: "CM_Services",
    construction: "Construction",
    row: "ROW",
};

function matchCategory(text: string): string | undefined {
    const lower = text.toLowerCase();
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(key)) return val;
    }
    return undefined;
}

interface ShannonBudgetData {
    projectName?: string;
    fundingSources: {
        sourceName: string;
        allocatedAmount: number;
        yearAllocations: Record<string, number>;
    }[];
    budgetLineItems: { category: string; projectedCost: number }[];
}

function parseShannonBudgetWorksheet(ws: XLSX.WorkSheet): ShannonBudgetData {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const result: ShannonBudgetData = {
        fundingSources: [],
        budgetLineItems: [],
    };

    // Scan for project name in top rows
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (!row) continue;
        const label = String(row[0] ?? "").toLowerCase().trim();
        if (label.includes("project") && (label.includes("name") || label.includes("title"))) {
            result.projectName = cellStr(row[1]);
            break;
        }
    }

    if (!result.projectName && rows.length > 0) {
        const firstVal = cellStr(rows[0]?.[0]);
        if (firstVal && !firstVal.toLowerCase().includes("budget")) {
            result.projectName = firstVal;
        }
    }

    // Scan all rows for funding sources and budget line items sections
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const label = String(row[0] ?? "").toLowerCase().trim();

        // Funding sources section
        if (label.includes("funding") || label.includes("source")) {
            // Next row is likely a header with year columns
            const headerRow = rows[i + 1];
            if (!headerRow) continue;
            const headers = (headerRow as unknown[]).map((c) => String(c ?? "").toLowerCase().trim());

            let nameCol = 0;
            const yearCols: { col: number; year: string }[] = [];
            let totalCol = -1;

            headers.forEach((h, j) => {
                if (h.includes("source") || h.includes("name") || h.includes("fund")) nameCol = j;
                const yearMatch = h.match(/(20\d{2})/);
                if (yearMatch) yearCols.push({ col: j, year: yearMatch[1] });
                if (h.includes("total")) totalCol = j;
            });

            for (let j = i + 2; j < rows.length; j++) {
                const dataRow = rows[j];
                if (!dataRow) continue;
                const name = cellStr(dataRow[nameCol]);
                if (!name || name.toLowerCase().includes("total")) break;

                const yearAllocs: Record<string, number> = {};
                let total = 0;
                for (const yc of yearCols) {
                    const amt = toCents(dataRow[yc.col]);
                    yearAllocs[yc.year] = amt;
                    total += amt;
                }
                if (totalCol >= 0) {
                    total = toCents(dataRow[totalCol]);
                }

                result.fundingSources.push({
                    sourceName: name,
                    allocatedAmount: total,
                    yearAllocations: yearAllocs,
                });
            }
        }

        // Budget categories section (Design, Inspector/Material, Permitting, Misc)
        if (label.includes("budget") && (label.includes("category") || label.includes("line") || label.includes("item"))) {
            for (let j = i + 1; j < rows.length; j++) {
                const dataRow = rows[j];
                if (!dataRow) continue;
                const catName = cellStr(dataRow[0]);
                if (!catName || catName.toLowerCase().includes("total")) break;

                const matched = matchCategory(catName);
                if (matched) {
                    result.budgetLineItems.push({
                        category: matched,
                        projectedCost: toCents(dataRow[1]),
                    });
                }
            }
        }
    }

    return result;
}

interface ShannonInvoiceData {
    vendor?: string;
    contractNumber?: string;
    originalAmount: number;
    invoices: {
        invoiceNumber: string;
        totalAmount: number;
        dateReceived?: string;
        taskBreakdowns: { category: string; taskDescription?: string; amount: number }[];
    }[];
}

function parseShannonDEaTab(ws: XLSX.WorkSheet): ShannonInvoiceData {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const result: ShannonInvoiceData = {
        originalAmount: 0,
        invoices: [],
    };

    // Detect simple vs detailed by column count
    const maxCols = Math.max(...rows.map((r) => (r as unknown[]).length));
    const isDetailed = maxCols >= 32;

    // Contract metadata from top rows
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row) continue;
        const label = String(row[0] ?? "").toLowerCase().trim();

        if (label.includes("vendor") || label.includes("consultant")) {
            result.vendor = cellStr(row[1]);
        }
        if (label.includes("contract") && (label.includes("amount") || label.includes("original"))) {
            result.originalAmount = toCents(row[1]);
        }
        if (label.includes("contract") && (label.includes("number") || label.includes("#"))) {
            result.contractNumber = cellStr(row[1]);
        }
    }

    // Find invoice header row
    let headerIdx = -1;
    let headers: string[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const rowHeaders = (row as unknown[]).map((c) => String(c ?? "").toLowerCase().trim());

        if (rowHeaders.some((h) => h.includes("invoice") && (h.includes("number") || h.includes("#") || h.includes("no")))) {
            headerIdx = i;
            headers = rowHeaders;
            break;
        }
    }

    if (headerIdx < 0) return result;

    // Map standard columns
    const invNumCol = headers.findIndex((h) => h.includes("invoice") && (h.includes("number") || h.includes("#") || h.includes("no")));
    const dateCol = headers.findIndex((h) => h.includes("date") && !h.includes("approved"));
    const totalCol = headers.findIndex((h) => h.includes("total") || (h.includes("amount") && !h.includes("task")));

    // In detailed format, find task breakdown columns
    const taskCols: { col: number; category: string; description: string }[] = [];
    if (isDetailed) {
        for (let j = 0; j < headers.length; j++) {
            if (j === invNumCol || j === dateCol || j === totalCol) continue;
            const h = headers[j];
            if (!h || h.includes("invoice") || h.includes("date") || h.includes("total") || h.includes("running")) continue;

            const matched = matchCategory(h);
            if (matched) {
                taskCols.push({ col: j, category: matched, description: h });
            }
        }
    }

    // Parse invoice rows
    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const invNum = cellStr(row[invNumCol >= 0 ? invNumCol : 0]);
        if (!invNum) continue;

        const taskBreakdowns: { category: string; taskDescription?: string; amount: number }[] = [];
        if (isDetailed) {
            for (const tc of taskCols) {
                const amt = toCents(row[tc.col]);
                if (amt !== 0) {
                    taskBreakdowns.push({
                        category: tc.category,
                        taskDescription: tc.description,
                        amount: amt,
                    });
                }
            }
        }

        const totalAmount = totalCol >= 0 ? toCents(row[totalCol]) : 0;

        result.invoices.push({
            invoiceNumber: invNum,
            totalAmount: totalAmount || taskBreakdowns.reduce((s, t) => s + t.amount, 0),
            dateReceived: parseDate(row[dateCol >= 0 ? dateCol : 1]),
            taskBreakdowns,
        });
    }

    return result;
}

// ============================================================
// Router
// ============================================================

export const importRouter = router({
    /**
     * Import Eric's 18013_Budget style spreadsheet.
     * [trace: skill xlsx-eric-parser — Overview, Design, ROW, CM Services, Construction tabs]
     */
    importEricXlsx: publicProcedure
        .input(
            z.object({
                base64: z.string(),
                projectId: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const wb = XLSX.read(input.base64, { type: "base64" });
            const sheetNames = wb.SheetNames.map((s) => s.toLowerCase());

            // 1. Parse Overview tab → project metadata
            const overviewSheet = wb.Sheets[wb.SheetNames[sheetNames.findIndex((s) => s.includes("overview"))] ?? wb.SheetNames[0]];
            const overview = overviewSheet ? parseEricOverview(overviewSheet) : { budgetCodes: [] };

            // 2. Create or use existing project
            let projectId = input.projectId;
            if (!projectId) {
                const [project] = await db
                    .insert(schema.projects)
                    .values({
                        name: overview.name ?? "Imported Project",
                        cfpNumber: overview.cfpNumber,
                        projectNumber: overview.projectNumber,
                        councilAuthDate: overview.councilAuthDate,
                    })
                    .returning();
                projectId = project.id;
            }

            // Store Springbrook budget codes as funding source display text
            for (const bc of overview.budgetCodes) {
                await db.insert(schema.fundingSources).values({
                    projectId,
                    sourceName: bc.description ?? bc.code,
                    springbrookBudgetCode: bc.code,
                    allocatedAmount: 0,
                });
            }

            const importedContracts: { type: string; id: number }[] = [];
            const importedInvoices: number[] = [];

            // Helper: import a contract tab
            async function importContractTab(
                tabName: string,
                contractType: (typeof schema.CONTRACT_TYPES)[number],
            ): Promise<void> {
                const idx = sheetNames.findIndex((s) => s.includes(tabName));
                if (idx < 0) return;

                const ws = wb.Sheets[wb.SheetNames[idx]];
                if (!ws) return;

                const parsed = parseEricContractTab(ws);

                // Insert contract
                const [contract] = await db
                    .insert(schema.contracts)
                    .values({
                        projectId: projectId!,
                        vendor: parsed.vendor ?? `${contractType} Vendor`,
                        contractNumber: parsed.contractNumber,
                        type: contractType,
                        originalAmount: parsed.originalAmount,
                        signedDocumentLink: parsed.signedDocumentLink,
                    })
                    .returning();

                importedContracts.push({ type: contractType, id: contract.id });

                // Insert supplements
                for (const supp of parsed.supplements) {
                    await db.insert(schema.contractSupplements).values({
                        contractId: contract.id,
                        supplementNumber: supp.supplementNumber,
                        amount: supp.amount,
                        date: supp.date,
                        description: supp.description,
                    });
                }

                // Auto-generate budget line items
                await ensureBudgetLineItems(projectId!, contractType);

                // Insert invoices
                for (const inv of parsed.invoices) {
                    const [invoice] = await db
                        .insert(schema.invoices)
                        .values({
                            projectId: projectId!,
                            contractId: contract.id,
                            invoiceNumber: inv.invoiceNumber,
                            vendor: inv.vendor,
                            totalAmount: inv.totalAmount,
                            dateReceived: inv.dateReceived,
                            status: "Received",
                        })
                        .returning();
                    importedInvoices.push(invoice.id);
                }
            }

            // 3. Parse contract tabs
            await importContractTab("design", "Design");
            await importContractTab("cm", "CM_Services");
            await importContractTab("construction", "Construction");

            // 4. Parse ROW tab → rowParcels
            let importedParcels = 0;
            const rowIdx = sheetNames.findIndex((s) => s.includes("row"));
            if (rowIdx >= 0) {
                const ws = wb.Sheets[wb.SheetNames[rowIdx]];
                if (ws) {
                    const parcels = parseEricROWTab(ws);
                    for (const p of parcels) {
                        await db.insert(schema.rowParcels).values({
                            projectId,
                            parcelNumber: p.parcelNumber,
                            expenditureType: p.expenditureType,
                            amount: p.amount,
                        });
                    }
                    importedParcels = parcels.length;
                }

                // Ensure ROW budget line item exists
                const existing = await db.query.budgetLineItems.findFirst({
                    where: (bli, { and: a, eq: e }) =>
                        a(e(bli.projectId, projectId!), e(bli.category, "ROW")),
                });
                if (!existing) {
                    await db.insert(schema.budgetLineItems).values({
                        projectId,
                        category: "ROW",
                        projectedCost: 0,
                        percentScopeComplete: 0,
                    });
                }
            }

            return {
                projectId,
                projectName: overview.name,
                contracts: importedContracts.length,
                invoices: importedInvoices.length,
                parcels: importedParcels,
                budgetCodes: overview.budgetCodes.length,
            };
        }),

    /**
     * Import Shannon's BTR Expense Tracking Worksheet.
     * [trace: skill xlsx-shannon-parser — Budget Worksheet, DEa tab, simple vs detailed]
     */
    importShannonXlsx: publicProcedure
        .input(
            z.object({
                base64: z.string(),
                projectId: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const wb = XLSX.read(input.base64, { type: "base64" });
            const sheetNames = wb.SheetNames.map((s) => s.toLowerCase());

            // 1. Parse Budget Worksheet tab
            const budgetIdx = sheetNames.findIndex((s) => s.includes("budget"));
            const budgetSheet = budgetIdx >= 0 ? wb.Sheets[wb.SheetNames[budgetIdx]] : wb.Sheets[wb.SheetNames[0]];
            const budget = budgetSheet ? parseShannonBudgetWorksheet(budgetSheet) : {
                fundingSources: [],
                budgetLineItems: [],
            } as ShannonBudgetData;

            // 2. Create or use existing project
            let projectId = input.projectId;
            if (!projectId) {
                const [project] = await db
                    .insert(schema.projects)
                    .values({
                        name: budget.projectName ?? "Imported Project",
                    })
                    .returning();
                projectId = project.id;
            }

            // 3. Insert funding sources
            for (const fs of budget.fundingSources) {
                await db.insert(schema.fundingSources).values({
                    projectId,
                    sourceName: fs.sourceName,
                    allocatedAmount: fs.allocatedAmount,
                    yearAllocations: JSON.stringify(fs.yearAllocations),
                });
            }

            // 4. Insert budget line items
            for (const bli of budget.budgetLineItems) {
                const existing = await db.query.budgetLineItems.findFirst({
                    where: (b, { and: a, eq: e }) =>
                        a(e(b.projectId, projectId!), e(b.category, bli.category as any)),
                });
                if (!existing) {
                    await db.insert(schema.budgetLineItems).values({
                        projectId,
                        category: bli.category as any,
                        projectedCost: bli.projectedCost,
                        percentScopeComplete: 0,
                    });
                }
            }

            // 5. Parse DEa tab → Design contract + invoices
            let importedInvoices = 0;
            let importedContract = false;
            const deaIdx = sheetNames.findIndex((s) => s.includes("dea") || s.includes("de a") || s === "dea");
            if (deaIdx >= 0) {
                const ws = wb.Sheets[wb.SheetNames[deaIdx]];
                if (ws) {
                    const dea = parseShannonDEaTab(ws);

                    // Create Design contract
                    const [contract] = await db
                        .insert(schema.contracts)
                        .values({
                            projectId,
                            vendor: dea.vendor ?? "Design Consultant",
                            contractNumber: dea.contractNumber,
                            type: "Design",
                            originalAmount: dea.originalAmount,
                        })
                        .returning();
                    importedContract = true;

                    // Ensure Design budget line items
                    await ensureBudgetLineItems(projectId, "Design");

                    // Get budget line item map for task breakdowns
                    const blis = await db.query.budgetLineItems.findMany({
                        where: eq(schema.budgetLineItems.projectId, projectId),
                    });
                    const bliByCategory = new Map(blis.map((b) => [b.category, b.id]));

                    // Insert invoices — use invoiceNumber as merge key
                    for (const inv of dea.invoices) {
                        // Check if invoice already exists (merge key)
                        const existingInvoice = await db.query.invoices.findFirst({
                            where: (i, { and: a, eq: e }) =>
                                a(
                                    e(i.projectId, projectId!),
                                    e(i.invoiceNumber, inv.invoiceNumber),
                                ),
                        });

                        let invoiceId: number;
                        if (existingInvoice) {
                            // Update existing invoice
                            const [updated] = await db
                                .update(schema.invoices)
                                .set({
                                    totalAmount: inv.totalAmount,
                                    dateReceived: inv.dateReceived,
                                    contractId: contract.id,
                                })
                                .where(eq(schema.invoices.id, existingInvoice.id))
                                .returning();
                            invoiceId = updated.id;
                        } else {
                            const [created] = await db
                                .insert(schema.invoices)
                                .values({
                                    projectId,
                                    contractId: contract.id,
                                    invoiceNumber: inv.invoiceNumber,
                                    vendor: dea.vendor,
                                    totalAmount: inv.totalAmount,
                                    dateReceived: inv.dateReceived,
                                    status: "Received",
                                })
                                .returning();
                            invoiceId = created.id;
                        }

                        // Insert task breakdowns
                        for (const tb of inv.taskBreakdowns) {
                            const bliId = bliByCategory.get(tb.category as schema.BudgetCategory);
                            await db.insert(schema.invoiceTaskBreakdown).values({
                                invoiceId,
                                budgetLineItemId: bliId,
                                taskDescription: tb.taskDescription,
                                amount: tb.amount,
                            });
                        }

                        importedInvoices++;
                    }
                }
            }

            return {
                projectId,
                projectName: budget.projectName,
                fundingSources: budget.fundingSources.length,
                budgetLineItems: budget.budgetLineItems.length,
                contract: importedContract,
                invoices: importedInvoices,
            };
        }),
});
