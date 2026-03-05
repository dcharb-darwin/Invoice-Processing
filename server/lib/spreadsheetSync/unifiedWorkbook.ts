import crypto from "crypto";
import * as XLSX from "xlsx";
import type * as schema from "../../db/schema.js";

export const UNIFIED_FORMAT_VERSION = "unified_xlsx_v1";

export const REQUIRED_UNIFIED_TABS = [
    "Overview",
    "Design",
    "ROW Parcels",
    "CM Services",
    "Construction",
    "Funding & Grants",
] as const;

export type WorkbookFormat =
    | "unified_v1"
    | "eric_legacy"
    | "shannon_legacy_simple"
    | "shannon_legacy_detailed"
    | "unknown";

export interface ValidationIssue {
    code: string;
    severity: "critical" | "warning";
    message: string;
    tab?: string;
}

export interface ParsedUnifiedData {
    overview: {
        projectId?: number;
        name?: string;
        cfpNumber?: string;
        projectNumber?: string;
        projectType?: string;
        projectManager?: string;
        councilAuthDate?: string;
        appSnapshotAt?: string;
    };
    contracts: Array<{
        type: schema.ContractType;
        vendor: string;
        contractNumber?: string;
        originalAmount: number;
        signedDocumentLink?: string;
        invoices: Array<{
            invoiceNumber: string;
            vendor?: string;
            totalAmount: number;
            dateReceived?: string;
            dateApproved?: string;
            status?: schema.InvoiceStatus;
            grantEligible?: boolean;
            grantCode?: string;
            sourcePdfPath?: string;
            signedPdfPath?: string;
            taskBreakdowns: Array<{
                budgetCategory?: schema.BudgetCategory;
                taskCode?: string;
                taskDescription?: string;
                amount: number;
            }>;
        }>;
    }>;
    rowParcels: Array<{
        parcelNumber: string;
        expenditureType?: string;
        amount: number;
    }>;
    fundingSources: Array<{
        sourceName: string;
        springbrookBudgetCode?: string;
        allocatedAmount: number;
        yearAllocations?: string;
    }>;
    meta: Record<string, string>;
}

function normalizeTab(name: string): string {
    return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeDate(value: unknown): string | undefined {
    if (value == null || value === "") return undefined;
    if (typeof value === "number") {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (!parsed) return undefined;
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
    const s = String(value).trim();
    if (!s) return undefined;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10);
}

export function workbookHash(base64: string): string {
    return crypto.createHash("sha256").update(base64).digest("hex");
}

export function payloadHash(value: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function moneyToCents(value: unknown): number {
    if (value == null || value === "") return 0;
    const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,]/g, ""));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
}

function toStringOrUndefined(value: unknown): string | undefined {
    if (value == null) return undefined;
    const s = String(value).trim();
    return s || undefined;
}

function toBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const s = String(value ?? "").trim().toLowerCase();
    return s === "true" || s === "yes" || s === "y" || s === "1";
}

function normalizeStatus(value: unknown): schema.InvoiceStatus | undefined {
    const s = String(value ?? "").trim();
    if (!s) return undefined;
    const allowed = ["Received", "Logged", "Reviewed", "Signed", "Paid"];
    return (allowed.includes(s) ? s : "Received") as schema.InvoiceStatus;
}

function categoryFromText(value: unknown): schema.BudgetCategory | undefined {
    const s = String(value ?? "").trim();
    if (!s) return undefined;
    const allowed = [
        "Design",
        "ROW",
        "CM_Services",
        "Construction",
        "Inspector_Material",
        "Permitting",
        "Misc",
    ];
    return (allowed.includes(s) ? s : undefined) as schema.BudgetCategory | undefined;
}

export function detectWorkbookFormat(base64: string): {
    format: WorkbookFormat;
    confidence: number;
    sheetNames: string[];
} {
    const wb = XLSX.read(base64, { type: "base64" });
    const sheetNames = wb.SheetNames;
    const normalized = new Set(sheetNames.map(normalizeTab));

    const requiredNormalized = REQUIRED_UNIFIED_TABS.map(normalizeTab);
    const hasUnified = requiredNormalized.every((tab) => normalized.has(tab));
    if (hasUnified) {
        return { format: "unified_v1", confidence: 0.98, sheetNames };
    }

    const hasOverview = normalized.has("overview");
    const hasEricContractShape =
        normalized.has("design") && (normalized.has("cm services") || normalized.has("cm")) && normalized.has("construction");
    if (hasOverview && hasEricContractShape) {
        return { format: "eric_legacy", confidence: 0.92, sheetNames };
    }

    const hasBudget = normalized.has("budget worksheet") || normalized.has("budget");
    const hasDea = normalized.has("dea") || normalized.has("de a");
    if (hasBudget && hasDea) {
        const deaName = wb.SheetNames.find((s) => ["dea", "de a"].includes(normalizeTab(s)));
        const ws = deaName ? wb.Sheets[deaName] : undefined;
        const rows: unknown[][] = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) : [];
        const maxCols = Math.max(0, ...rows.map((r) => r.length));
        if (maxCols >= 32) {
            return { format: "shannon_legacy_detailed", confidence: 0.9, sheetNames };
        }
        return { format: "shannon_legacy_simple", confidence: 0.9, sheetNames };
    }

    return { format: "unknown", confidence: 0.2, sheetNames };
}

function parseKeyValueSheet(ws: XLSX.WorkSheet): Record<string, string> {
    const rows: Array<{ Key?: string; Value?: string }> = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const out: Record<string, string> = {};
    for (const row of rows) {
        const key = String(row.Key ?? "").trim();
        if (!key) continue;
        out[key] = String(row.Value ?? "").trim();
    }
    return out;
}

function parseContractTab(ws: XLSX.WorkSheet, type: schema.ContractType): ParsedUnifiedData["contracts"][number] {
    const rows: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const contract = {
        type,
        vendor: "",
        contractNumber: undefined as string | undefined,
        originalAmount: 0,
        signedDocumentLink: undefined as string | undefined,
        invoices: [] as ParsedUnifiedData["contracts"][number]["invoices"],
    };

    const invoiceMap = new Map<string, ParsedUnifiedData["contracts"][number]["invoices"][number]>();

    for (const row of rows) {
        contract.vendor = toStringOrUndefined(row.Vendor) ?? contract.vendor;
        contract.contractNumber = toStringOrUndefined(row.ContractNumber) ?? contract.contractNumber;
        contract.originalAmount = moneyToCents(row.OriginalAmount || contract.originalAmount / 100);
        contract.signedDocumentLink = toStringOrUndefined(row.SignedDocumentLink) ?? contract.signedDocumentLink;

        const invoiceNumber = toStringOrUndefined(row.InvoiceNumber);
        if (!invoiceNumber) continue;

        let invoice = invoiceMap.get(invoiceNumber);
        if (!invoice) {
            invoice = {
                invoiceNumber,
                vendor: toStringOrUndefined(row.InvoiceVendor) ?? toStringOrUndefined(row.Vendor),
                totalAmount: moneyToCents(row.TotalAmount),
                dateReceived: normalizeDate(row.DateReceived),
                dateApproved: normalizeDate(row.DateApproved),
                status: normalizeStatus(row.Status),
                grantEligible: toBoolean(row.GrantEligible),
                grantCode: toStringOrUndefined(row.GrantCode),
                sourcePdfPath: toStringOrUndefined(row.SourcePdfPath),
                signedPdfPath: toStringOrUndefined(row.SignedPdfPath),
                taskBreakdowns: [],
            };
            invoiceMap.set(invoiceNumber, invoice);
        }

        const taskAmount = moneyToCents(row.TaskAmount);
        if (taskAmount !== 0 || toStringOrUndefined(row.TaskCode) || toStringOrUndefined(row.TaskDescription)) {
            invoice.taskBreakdowns.push({
                budgetCategory: categoryFromText(row.BudgetCategory),
                taskCode: toStringOrUndefined(row.TaskCode),
                taskDescription: toStringOrUndefined(row.TaskDescription),
                amount: taskAmount,
            });
        }
    }

    contract.invoices = Array.from(invoiceMap.values());
    return contract;
}

export function parseUnifiedWorkbook(base64: string): ParsedUnifiedData {
    const wb = XLSX.read(base64, { type: "base64" });
    const tabMap = new Map<string, string>(
        wb.SheetNames.map((name) => [normalizeTab(name), name]),
    );

    const overviewSheetName = tabMap.get("overview");
    const rowSheetName = tabMap.get("row parcels");
    const fundingSheetName = tabMap.get("funding & grants");
    const designSheetName = tabMap.get("design");
    const cmSheetName = tabMap.get("cm services");
    const constructionSheetName = tabMap.get("construction");
    const metaSheetName = tabMap.get("ipc_meta");

    const overview = overviewSheetName
        ? parseKeyValueSheet(wb.Sheets[overviewSheetName])
        : {};
    const meta = metaSheetName
        ? parseKeyValueSheet(wb.Sheets[metaSheetName])
        : {};

    const contracts: ParsedUnifiedData["contracts"] = [];
    if (designSheetName) contracts.push(parseContractTab(wb.Sheets[designSheetName], "Design"));
    if (cmSheetName) contracts.push(parseContractTab(wb.Sheets[cmSheetName], "CM_Services"));
    if (constructionSheetName) contracts.push(parseContractTab(wb.Sheets[constructionSheetName], "Construction"));

    const rowParcelsRows: Array<Record<string, unknown>> = rowSheetName
        ? XLSX.utils.sheet_to_json(wb.Sheets[rowSheetName], { defval: "" })
        : [];
    const rowParcels = rowParcelsRows
        .map((row) => ({
            parcelNumber: toStringOrUndefined(row.ParcelNumber) ?? "",
            expenditureType: toStringOrUndefined(row.ExpenditureType),
            amount: moneyToCents(row.Amount),
        }))
        .filter((row) => row.parcelNumber);

    const fundingRows: Array<Record<string, unknown>> = fundingSheetName
        ? XLSX.utils.sheet_to_json(wb.Sheets[fundingSheetName], { defval: "" })
        : [];
    const fundingSources = fundingRows
        .filter((row) => String(row.SourceType ?? "").trim().toLowerCase() !== "grant")
        .map((row) => ({
            sourceName: toStringOrUndefined(row.SourceName) ?? "",
            springbrookBudgetCode: toStringOrUndefined(row.SpringbrookBudgetCode),
            allocatedAmount: moneyToCents(row.AllocatedAmount),
            yearAllocations: toStringOrUndefined(row.YearAllocations),
        }))
        .filter((row) => row.sourceName);

    return {
        overview: {
            projectId: overview.ProjectId ? Number(overview.ProjectId) : undefined,
            name: overview.Name,
            cfpNumber: overview.CFPNumber,
            projectNumber: overview.ProjectNumber,
            projectType: overview.ProjectType,
            projectManager: overview.ProjectManager,
            councilAuthDate: overview.CouncilAuthDate,
            appSnapshotAt: overview.AppSnapshotAt,
        },
        contracts,
        rowParcels,
        fundingSources,
        meta,
    };
}

export function validateUnifiedWorkbook(base64: string, projectUpdatedAt?: string): {
    parsed: ParsedUnifiedData;
    criticalIssues: ValidationIssue[];
    warnings: ValidationIssue[];
    workbookHash: string;
} {
    const wb = XLSX.read(base64, { type: "base64" });
    const normalized = new Set(wb.SheetNames.map(normalizeTab));
    const criticalIssues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const tab of REQUIRED_UNIFIED_TABS) {
        if (!normalized.has(normalizeTab(tab))) {
            criticalIssues.push({
                code: "required_tab_missing",
                severity: "critical",
                tab,
                message: `Required tab "${tab}" is missing.`,
            });
        }
    }

    const parsed = parseUnifiedWorkbook(base64);

    const invoiceSeen = new Set<string>();
    for (const contract of parsed.contracts) {
        for (const invoice of contract.invoices) {
            const key = invoice.invoiceNumber.toLowerCase();
            if (invoiceSeen.has(key)) {
                criticalIssues.push({
                    code: "duplicate_invoice_number",
                    severity: "critical",
                    tab: contract.type,
                    message: `Duplicate invoice number "${invoice.invoiceNumber}" detected in workbook.`,
                });
            }
            invoiceSeen.add(key);

            if (invoice.taskBreakdowns.length > 0) {
                const taskSum = invoice.taskBreakdowns.reduce((sum, tb) => sum + tb.amount, 0);
                if (taskSum > invoice.totalAmount) {
                    criticalIssues.push({
                        code: "invoice_task_sum_exceeds_total",
                        severity: "critical",
                        tab: contract.type,
                        message: `Invoice ${invoice.invoiceNumber} has task total greater than invoice total.`,
                    });
                }
            }
        }
    }

    if (!parsed.meta.formatVersion) {
        warnings.push({
            code: "meta_sheet_missing_or_incomplete",
            severity: "warning",
            tab: "IPC_META",
            message: "IPC metadata sheet is missing or incomplete.",
        });
    }

    if (projectUpdatedAt && parsed.overview.appSnapshotAt) {
        const projectTs = Date.parse(projectUpdatedAt);
        const snapshotTs = Date.parse(parsed.overview.appSnapshotAt);
        if (!Number.isNaN(projectTs) && !Number.isNaN(snapshotTs) && projectTs > snapshotTs) {
            criticalIssues.push({
                code: "stale_workbook_conflict",
                severity: "critical",
                tab: "IPC_META",
                message: "Workbook was exported before the latest IPC project update.",
            });
        }
    }

    return {
        parsed,
        criticalIssues,
        warnings,
        workbookHash: workbookHash(base64),
    };
}

type ExportProject = {
    id: number;
    name: string;
    cfpNumber: string | null;
    projectNumber: string | null;
    type: string | null;
    projectManager: string | null;
    councilAuthDate: string | null;
    updatedAt: string;
    fundingSources: Array<{
        sourceName: string;
        springbrookBudgetCode: string | null;
        allocatedAmount: number;
        yearAllocations: string | null;
    }>;
    rowParcels: Array<{
        parcelNumber: string;
        expenditureType: string | null;
        amount: number;
    }>;
    budgetLineItems: Array<{
        id: number;
        category: schema.BudgetCategory;
    }>;
    contracts: Array<{
        id: number;
        type: schema.ContractType;
        vendor: string;
        contractNumber: string | null;
        originalAmount: number;
        signedDocumentLink: string | null;
        supplements: Array<{
            amount: number;
        }>;
    }>;
    invoices: Array<{
        id: number;
        contractId: number | null;
        invoiceNumber: string;
        vendor: string | null;
        totalAmount: number;
        dateReceived: string | null;
        dateApproved: string | null;
        status: string | null;
        grantEligible: boolean | null;
        grantCode: string | null;
        sourcePdfPath: string | null;
        signedPdfPath: string | null;
        taskBreakdowns: Array<{
            id: number;
            budgetLineItemId: number | null;
            taskCode: string | null;
            taskDescription: string | null;
            amount: number;
        }>;
    }>;
};

function contractTabRows(
    project: ExportProject,
    contractType: schema.ContractType,
): Array<Record<string, string | number | boolean>> {
    const categoryByBliId = new Map(project.budgetLineItems.map((bli) => [bli.id, bli.category]));
    const contracts = project.contracts.filter((c) => c.type === contractType);
    const rows: Array<Record<string, string | number | boolean>> = [];

    for (const contract of contracts) {
        const supplementsTotal = contract.supplements.reduce((sum, s) => sum + s.amount, 0);
        const cumulativeTotal = contract.originalAmount + supplementsTotal;
        const invoices = project.invoices.filter((inv) => inv.contractId === contract.id);

        if (invoices.length === 0) {
            rows.push({
                ContractId: contract.id,
                ContractType: contract.type,
                Vendor: contract.vendor,
                ContractNumber: contract.contractNumber ?? "",
                OriginalAmount: contract.originalAmount / 100,
                SupplementsTotal: supplementsTotal / 100,
                CumulativeTotal: cumulativeTotal / 100,
                SignedDocumentLink: contract.signedDocumentLink ?? "",
                InvoiceNumber: "",
                InvoiceVendor: "",
                TotalAmount: 0,
                DateReceived: "",
                DateApproved: "",
                Status: "",
                GrantEligible: false,
                GrantCode: "",
                TaskCode: "",
                TaskDescription: "",
                TaskAmount: 0,
                BudgetCategory: "",
                SourcePdfPath: "",
                SignedPdfPath: "",
            });
            continue;
        }

        for (const invoice of invoices) {
            const breakdowns = invoice.taskBreakdowns.length > 0
                ? invoice.taskBreakdowns
                : [{
                    id: -1,
                    budgetLineItemId: null,
                    taskCode: null,
                    taskDescription: null,
                    amount: 0,
                }];

            for (const tb of breakdowns) {
                rows.push({
                    ContractId: contract.id,
                    ContractType: contract.type,
                    Vendor: contract.vendor,
                    ContractNumber: contract.contractNumber ?? "",
                    OriginalAmount: contract.originalAmount / 100,
                    SupplementsTotal: supplementsTotal / 100,
                    CumulativeTotal: cumulativeTotal / 100,
                    SignedDocumentLink: contract.signedDocumentLink ?? "",
                    InvoiceNumber: invoice.invoiceNumber,
                    InvoiceVendor: invoice.vendor ?? "",
                    TotalAmount: invoice.totalAmount / 100,
                    DateReceived: invoice.dateReceived ?? "",
                    DateApproved: invoice.dateApproved ?? "",
                    Status: invoice.status ?? "",
                    GrantEligible: Boolean(invoice.grantEligible),
                    GrantCode: invoice.grantCode ?? "",
                    TaskCode: tb.taskCode ?? "",
                    TaskDescription: tb.taskDescription ?? "",
                    TaskAmount: tb.amount / 100,
                    BudgetCategory: tb.budgetLineItemId ? (categoryByBliId.get(tb.budgetLineItemId) ?? "") : "",
                    SourcePdfPath: invoice.sourcePdfPath ?? "",
                    SignedPdfPath: invoice.signedPdfPath ?? "",
                });
            }
        }
    }

    if (rows.length === 0) {
        rows.push({
            ContractId: "",
            ContractType: contractType,
            Vendor: "",
            ContractNumber: "",
            OriginalAmount: 0,
            SupplementsTotal: 0,
            CumulativeTotal: 0,
            SignedDocumentLink: "",
            InvoiceNumber: "",
            InvoiceVendor: "",
            TotalAmount: 0,
            DateReceived: "",
            DateApproved: "",
            Status: "",
            GrantEligible: false,
            GrantCode: "",
            TaskCode: "",
            TaskDescription: "",
            TaskAmount: 0,
            BudgetCategory: "",
            SourcePdfPath: "",
            SignedPdfPath: "",
        });
    }

    return rows;
}

export function exportUnifiedWorkbook(project: ExportProject): {
    base64: string;
    formatVersion: string;
    workbookHash: string;
    fileName: string;
} {
    const wb = XLSX.utils.book_new();

    const totalBudget = project.fundingSources.reduce((sum, s) => sum + s.allocatedAmount, 0);
    const totalPaid = project.invoices.reduce((sum, i) => sum + i.totalAmount, 0);

    const overviewRows = [
        { Key: "FormatVersion", Value: UNIFIED_FORMAT_VERSION },
        { Key: "ProjectId", Value: String(project.id) },
        { Key: "Name", Value: project.name },
        { Key: "CFPNumber", Value: project.cfpNumber ?? "" },
        { Key: "ProjectNumber", Value: project.projectNumber ?? "" },
        { Key: "ProjectType", Value: project.type ?? "" },
        { Key: "ProjectManager", Value: project.projectManager ?? "" },
        { Key: "CouncilAuthDate", Value: project.councilAuthDate ?? "" },
        { Key: "AppSnapshotAt", Value: project.updatedAt },
        { Key: "TotalBudget", Value: String(totalBudget / 100) },
        { Key: "TotalPaid", Value: String(totalPaid / 100) },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), "Overview");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contractTabRows(project, "Design")), "Design");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(project.rowParcels.map((p) => ({
        ParcelNumber: p.parcelNumber,
        ExpenditureType: p.expenditureType ?? "",
        Amount: p.amount / 100,
    }))), "ROW Parcels");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contractTabRows(project, "CM_Services")), "CM Services");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contractTabRows(project, "Construction")), "Construction");

    const grantSummary = new Map<string, { invoiceCount: number; totalAmount: number }>();
    for (const inv of project.invoices) {
        if (!inv.grantEligible || !inv.grantCode) continue;
        const curr = grantSummary.get(inv.grantCode) ?? { invoiceCount: 0, totalAmount: 0 };
        curr.invoiceCount += 1;
        curr.totalAmount += inv.totalAmount;
        grantSummary.set(inv.grantCode, curr);
    }
    const fundingRows: Array<Record<string, string | number | boolean>> = [
        ...project.fundingSources.map((source) => ({
            SourceType: "Funding",
            SourceName: source.sourceName,
            SpringbrookBudgetCode: source.springbrookBudgetCode ?? "",
            AllocatedAmount: source.allocatedAmount / 100,
            YearAllocations: source.yearAllocations ?? "",
            GrantCode: "",
            GrantEligible: false,
            GrantInvoiceCount: 0,
            GrantInvoiceTotal: 0,
        })),
        ...Array.from(grantSummary.entries()).map(([grantCode, summary]) => ({
            SourceType: "Grant",
            SourceName: "Grant Summary",
            SpringbrookBudgetCode: "",
            AllocatedAmount: 0,
            YearAllocations: "",
            GrantCode: grantCode,
            GrantEligible: true,
            GrantInvoiceCount: summary.invoiceCount,
            GrantInvoiceTotal: summary.totalAmount / 100,
        })),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fundingRows), "Funding & Grants");

    const payload = {
        projectId: project.id,
        updatedAt: project.updatedAt,
        totals: { totalBudget, totalPaid },
        counts: {
            fundingSources: project.fundingSources.length,
            contracts: project.contracts.length,
            invoices: project.invoices.length,
            rowParcels: project.rowParcels.length,
        },
    };
    const pHash = payloadHash(payload);
    const metaRows = [
        { Key: "formatVersion", Value: UNIFIED_FORMAT_VERSION },
        { Key: "exportedAt", Value: new Date().toISOString() },
        { Key: "projectId", Value: String(project.id) },
        { Key: "appSnapshotAt", Value: project.updatedAt },
        { Key: "workbookHash", Value: pHash },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metaRows), "IPC_META");

    wb.Workbook = wb.Workbook ?? { Sheets: [] };
    wb.Workbook.Sheets = wb.SheetNames.map((name) => ({
        name,
        Hidden: name === "IPC_META" ? 1 : 0,
    }));

    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    return {
        base64,
        formatVersion: UNIFIED_FORMAT_VERSION,
        workbookHash: pHash,
        fileName: `${project.name}-unified.xlsx`,
    };
}
