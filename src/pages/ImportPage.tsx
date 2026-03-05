import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";
import PdfExtractReview from "../components/PdfExtractReview.js";

type ParserType = "eric" | "shannon" | "unified";
type ToastState = { type: "success" | "error"; message: string } | null;
type ImportTab = "spreadsheet" | "pdf";

function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                reject(new Error("Failed to read file."));
                return;
            }
            const base64 = reader.result.split(",")[1];
            if (!base64) {
                reject(new Error("Invalid file format."));
                return;
            }
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
        reader.readAsDataURL(file);
    });
}

export default function ImportPage() {
    const [tab, setTab] = useState<ImportTab>("pdf");
    const [file, setFile] = useState<File | null>(null);
    const [parser, setParser] = useState<ParserType>("eric");
    const [toast, setToast] = useState<ToastState>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [targetProjectId, setTargetProjectId] = useState<number | "">("");
    const [validation, setValidation] = useState<{
        validationToken: string;
        format: string;
        criticalIssues: Array<{ code: string; message: string; tab?: string }>;
        warnings: Array<{ code: string; message: string; tab?: string }>;
    } | null>(null);

    const importEric = trpc.import.importEricXlsx.useMutation();
    const importShannon = trpc.import.importShannonXlsx.useMutation();
    const validateSync = trpc.spreadsheetSync.validate.useMutation();
    const importSync = trpc.spreadsheetSync.import.useMutation();
    const { data: projects } = trpc.projects.list.useQuery();

    const isImporting = importEric.isPending || importShannon.isPending || validateSync.isPending || importSync.isPending;

    useEffect(() => {
        if (!toast) return;
        const timeout = window.setTimeout(() => setToast(null), 4500);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            setToast({ type: "error", message: "Please select an .xlsx file." });
            return;
        }

        try {
            const base64 = await readFileAsBase64(file);
            if (parser === "unified") {
                if (!validation) {
                    const result = await validateSync.mutateAsync({
                        base64,
                        projectId: targetProjectId === "" ? undefined : targetProjectId,
                    });
                    setValidation({
                        validationToken: result.validationToken,
                        format: result.format,
                        criticalIssues: result.criticalIssues,
                        warnings: result.warnings,
                    });
                    if (result.criticalIssues.length > 0) {
                        setToast({ type: "error", message: `Validation failed (${result.criticalIssues.length} critical issues)` });
                    } else {
                        setToast({ type: "success", message: `Validation passed (${result.warnings.length} warnings)` });
                    }
                    return;
                }

                if (validation.criticalIssues.length > 0) {
                    setToast({ type: "error", message: "Fix critical validation issues before applying import." });
                    return;
                }
                if (targetProjectId === "") {
                    setToast({ type: "error", message: "Select a target project to apply unified import." });
                    return;
                }

                const result = await importSync.mutateAsync({
                    base64,
                    projectId: targetProjectId,
                    validationToken: validation.validationToken,
                });
                setToast({
                    type: "success",
                    message: `Unified import applied: ${result.upserts.contracts} contracts, ${result.upserts.invoices} invoices`,
                });
                setValidation(null);
                setFile(null);
                setFileInputKey((k) => k + 1);
                return;
            }

            const legacyResult = parser === "eric"
                ? await importEric.mutateAsync({ base64 })
                : await importShannon.mutateAsync({ base64 });

            const importedProjectName = legacyResult.projectName?.trim() || `Project #${legacyResult.projectId}`;
            setToast({ type: "success", message: `Imported ${importedProjectName}` });
            setValidation(null);
            setFile(null);
            setFileInputKey((k) => k + 1);
        } catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : "Import failed. Please verify workbook format.";
            setToast({ type: "error", message });
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {toast && (
                <div
                    className={`fixed top-20 right-6 z-50 rounded-xl border shadow-sm px-4 py-3 text-sm font-medium ${toast.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
                        : "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300"
                        }`}
                    role="status"
                    aria-live="polite"
                >
                    {toast.message}
                </div>
            )}

            <h2 className="text-2xl font-bold mb-2">Import Data</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Import from a spreadsheet or extract invoice data from a PDF.
            </p>

            {/* Tab switcher */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--color-bg)" }}>
                <button
                    onClick={() => setTab("pdf")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "pdf"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                    style={tab !== "pdf" ? { color: "var(--color-text-secondary)" } : undefined}
                >
                    📄 PDF Invoice
                </button>
                <button
                    onClick={() => setTab("spreadsheet")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "spreadsheet"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                    style={tab !== "spreadsheet" ? { color: "var(--color-text-secondary)" } : undefined}
                >
                    📊 Spreadsheet
                </button>
            </div>

            {/* PDF tab */}
            {tab === "pdf" && <PdfExtractReview />}

            {/* Spreadsheet tab */}
            {tab === "spreadsheet" && (
                <div
                    className="rounded-xl border shadow-sm p-6 md:p-8"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Workbook (.xlsx)</label>
                            <input
                                key={fileInputKey}
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                disabled={isImporting}
                                className="block w-full text-sm border rounded-xl px-4 py-3 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700 file:font-medium hover:file:bg-blue-100 disabled:opacity-60"
                                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                            />
                            {file && (
                                <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                                    Selected: {file.name}
                                </p>
                            )}
                        </div>

                        <fieldset>
                            <legend className="text-sm font-medium mb-3">Parser</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label
                                    className={`rounded-xl border p-4 cursor-pointer transition-colors ${parser === "eric"
                                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                        : ""
                                        }`}
                                    style={parser !== "eric" ? { borderColor: "var(--color-border)" } : undefined}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            name="parser"
                                            value="eric"
                                            checked={parser === "eric"}
                                            onChange={() => setParser("eric")}
                                            disabled={isImporting}
                                            className="mt-1 accent-blue-600"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold">Eric</div>
                                            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                                18013_Budget
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={`rounded-xl border p-4 cursor-pointer transition-colors ${parser === "unified"
                                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                        : ""
                                        }`}
                                    style={parser !== "unified" ? { borderColor: "var(--color-border)" } : undefined}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            name="parser"
                                            value="unified"
                                            checked={parser === "unified"}
                                            onChange={() => {
                                                setParser("unified");
                                                setValidation(null);
                                            }}
                                            disabled={isImporting}
                                            className="mt-1 accent-blue-600"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold">Unified v1</div>
                                            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                                6-tab standardized workbook
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={`rounded-xl border p-4 cursor-pointer transition-colors ${parser === "shannon"
                                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                        : ""
                                        }`}
                                    style={parser !== "shannon" ? { borderColor: "var(--color-border)" } : undefined}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            name="parser"
                                            value="shannon"
                                            checked={parser === "shannon"}
                                            onChange={() => setParser("shannon")}
                                            disabled={isImporting}
                                            className="mt-1 accent-blue-600"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold">Shannon</div>
                                            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                                BTR Expense Tracking
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </fieldset>

                        {parser === "unified" && (
                            <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--color-border)" }}>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Target Project</label>
                                    <select
                                        value={targetProjectId}
                                        onChange={(e) => {
                                            setTargetProjectId(e.target.value ? Number(e.target.value) : "");
                                            setValidation(null);
                                        }}
                                        className="w-full border rounded-lg px-3 py-2 text-sm"
                                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
                                    >
                                        <option value="">Select project…</option>
                                        {projects?.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {validation && (
                                    <div className="space-y-2 text-xs">
                                        <p className="font-semibold">
                                            Format: {validation.format} · Critical: {validation.criticalIssues.length} · Warnings: {validation.warnings.length}
                                        </p>
                                        {validation.criticalIssues.length > 0 && (
                                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                                                {validation.criticalIssues.map((issue, idx) => (
                                                    <p key={`${issue.code}-${idx}`}>• {issue.tab ? `[${issue.tab}] ` : ""}{issue.message}</p>
                                                ))}
                                            </div>
                                        )}
                                        {validation.warnings.length > 0 && (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
                                                {validation.warnings.map((issue, idx) => (
                                                    <p key={`${issue.code}-${idx}`}>• {issue.tab ? `[${issue.tab}] ` : ""}{issue.message}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!file || isImporting}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-medium text-sm shadow-sm transition-colors"
                        >
                            {isImporting && (
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            )}
                            {isImporting ? "Processing..." : (parser === "unified"
                                ? (validation ? "Apply Import" : "Validate Workbook")
                                : "Import File")}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
