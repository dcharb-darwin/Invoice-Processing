import { useState, useCallback } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney } from "../lib/format.js";

/**
 * PDF Invoice Extraction + Review component.
 * Upload a PDF → extract fields → review with confidence badges → save as invoice.
 * [trace: comprehensive-prd.md §3.9 — Human Review Flow]
 */

type ConfidenceLevel = "high" | "medium" | "low";

const BADGE: Record<ConfidenceLevel, { emoji: string; cls: string }> = {
    high: { emoji: "🟢", cls: "text-emerald-600 dark:text-emerald-400" },
    medium: { emoji: "🟡", cls: "text-amber-600 dark:text-amber-400" },
    low: { emoji: "🔴", cls: "text-red-600 dark:text-red-400" },
};

function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            base64 ? resolve(base64) : reject(new Error("Invalid file format."));
        };
        reader.onerror = () => reject(reader.error ?? new Error("Read failed."));
        reader.readAsDataURL(file);
    });
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
    const b = BADGE[level];
    return <span title={`${level} confidence`} className={`text-xs ${b.cls}`}>{b.emoji}</span>;
}

export default function PdfExtractReview() {
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [projectId, setProjectId] = useState<number | "">("");
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Extraction result state
    const [extraction, setExtraction] = useState<any>(null);
    // Editable fields (pre-filled from extraction, user can override)
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [vendor, setVendor] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [dateReceived, setDateReceived] = useState("");

    const extractMutation = trpc.extraction.extractFromPdf.useMutation();
    const createInvoice = trpc.invoices.create.useMutation();
    const saveFeedback = trpc.extraction.saveFeedback.useMutation();
    const { data: projects } = trpc.projects.list.useQuery();
    const [fileName, setFileName] = useState("");

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === "application/pdf") setFile(droppedFile);
    }, []);

    const handleExtract = async () => {
        if (!file) return;
        try {
            const base64 = await readFileAsBase64(file);
            const result = await extractMutation.mutateAsync({
                pdfBase64: base64,
                fileName: file.name,
                projectId: projectId !== "" ? projectId : undefined,
            });
            setExtraction(result);
            setFileName(file.name);
            // Pre-fill editable fields
            setInvoiceNumber(result.mapped.invoiceNumber || "");
            setVendor(result.mapped.vendor || "");
            setTotalAmount(String(result.mapped.totalAmount / 100)); // show dollars
            setDateReceived(result.mapped.dateReceived || "");
            if (result.suggestedProjectId && projectId === "") {
                setProjectId(result.suggestedProjectId);
            }
            setToast(null);
        } catch (err) {
            setToast({ type: "error", message: err instanceof Error ? err.message : "Extraction failed" });
        }
    };

    const handleSave = async () => {
        if (projectId === "" || !invoiceNumber) {
            setToast({ type: "error", message: "Project and invoice number are required." });
            return;
        }
        try {
            const totalCents = Math.round(parseFloat(totalAmount) * 100) || 0;
            const lineItems = extraction?.mapped?.lineItems || [];
            await createInvoice.mutateAsync({
                projectId: projectId as number,
                invoiceNumber,
                vendor: vendor || undefined,
                totalAmount: totalCents,
                dateReceived: dateReceived || undefined,
                status: "Received",
                taskBreakdowns: lineItems.map((li: any) => ({
                    taskCode: li.taskCode,
                    taskDescription: li.taskDescription,
                    amount: li.amount,
                })),
            });

            // Fire-and-forget: save feedback for learning loop
            if (extraction) {
                saveFeedback.mutate({
                    fileName,
                    providerName: extraction.extraction.providerName,
                    extractedFields: {
                        invoiceNumber: extraction.mapped.invoiceNumber,
                        vendor: extraction.mapped.vendor,
                        totalAmount: extraction.mapped.totalAmount,
                        dateReceived: extraction.mapped.dateReceived,
                    },
                    correctedFields: {
                        invoiceNumber,
                        vendor,
                        totalAmount: totalCents,
                        dateReceived,
                    },
                    overallConfidence: extraction.confidence?.score,
                });
            }

            setToast({ type: "success", message: `Invoice ${invoiceNumber} created successfully` });
            // Reset
            setFile(null);
            setExtraction(null);
            setFileName("");
        } catch (err) {
            setToast({ type: "error", message: err instanceof Error ? err.message : "Save failed" });
        }
    };

    const conf = extraction?.confidence;

    return (
        <div className="space-y-6">
            {toast && (
                <div
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${toast.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
                        : "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300"
                        }`}
                    role="status"
                >{toast.message}</div>
            )}

            {/* Upload zone */}
            {!extraction && (
                <div
                    className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    style={{ borderColor: dragOver ? undefined : "var(--color-border)" }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("pdf-file-input")?.click()}
                >
                    <input
                        id="pdf-file-input"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-sm font-medium mb-1">
                        {file ? file.name : "Drop a PDF invoice here or click to browse"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Supports David Evans and Shannon & Wilson formats
                    </p>
                </div>
            )}

            {/* Project selector + Extract button */}
            {file && !extraction && (
                <div className="flex gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-1">Project (optional)</label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
                            className="w-full border rounded-xl px-4 py-3 text-sm"
                            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                        >
                            <option value="">Auto-detect from PDF</option>
                            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleExtract}
                        disabled={extractMutation.isPending}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-medium text-sm shadow-sm transition-colors inline-flex items-center gap-2"
                    >
                        {extractMutation.isPending && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                        {extractMutation.isPending ? "Extracting…" : "Extract Invoice Data"}
                    </button>
                </div>
            )}

            {/* Review extracted data */}
            {extraction && (
                <div
                    className="rounded-xl border shadow-sm p-6"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Review Extracted Data</h3>
                        <div className="flex items-center gap-2 text-sm">
                            <ConfidenceBadge level={conf?.level || "low"} />
                            <span style={{ color: "var(--color-text-secondary)" }}>
                                Overall: {conf?.level} ({(conf?.score * 100).toFixed(0)}%)
                            </span>
                        </div>
                    </div>

                    <p className="text-xs mb-4 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                        ⚠️ Review all fields before saving. Edit any incorrect values. Provider: {extraction.extraction.providerName}
                    </p>

                    {/* Editable fields grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                                Invoice Number
                                {conf?.details?.invoiceNumber && <ConfidenceBadge level={conf.details.invoiceNumber.level} />}
                            </label>
                            <input
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                                Vendor
                                {conf?.details?.vendor && <ConfidenceBadge level={conf.details.vendor.level} />}
                            </label>
                            <input
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                                Total Amount ($)
                                {conf?.details?.totalAmount && <ConfidenceBadge level={conf.details.totalAmount.level} />}
                            </label>
                            <input
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                type="number"
                                step="0.01"
                                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                                Date Received
                                {conf?.details?.date && <ConfidenceBadge level={conf.details.date.level} />}
                            </label>
                            <input
                                value={dateReceived}
                                onChange={(e) => setDateReceived(e.target.value)}
                                type="date"
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-1 block">Project</label>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                            >
                                <option value="">— Select project —</option>
                                {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Line items */}
                    {extraction.mapped.lineItems.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2">Task Breakdown ({extraction.mapped.lineItems.length} items)</h4>
                            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ backgroundColor: "var(--color-bg)" }}>
                                            <th className="text-left px-3 py-2 font-medium text-xs">Task</th>
                                            <th className="text-left px-3 py-2 font-medium text-xs">Description</th>
                                            <th className="text-right px-3 py-2 font-medium text-xs">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extraction.mapped.lineItems.map((li: any, i: number) => (
                                            <tr key={i} className="border-t" style={{ borderColor: "var(--color-border-light)" }}>
                                                <td className="px-3 py-2 font-mono text-xs">{li.taskCode}</td>
                                                <td className="px-3 py-2 text-xs">{li.taskDescription}</td>
                                                <td className="px-3 py-2 text-right font-mono text-xs">{formatMoney(li.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                        <button
                            onClick={() => { setExtraction(null); setFile(null); }}
                            className="px-4 py-2 border rounded-xl text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={createInvoice.isPending || projectId === "" || !invoiceNumber}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-medium text-sm shadow-sm transition-colors inline-flex items-center gap-2"
                        >
                            {createInvoice.isPending && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                            Save & Create Invoice
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
