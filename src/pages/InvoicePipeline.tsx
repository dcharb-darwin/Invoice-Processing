import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney, formatDate } from "../lib/format.js";
import { sourceLabel, signedLabel, contractLabel } from "../lib/sourceLabels.js";

const STATUSES = ["Received", "Logged", "Reviewed", "Signed", "Paid"] as const;

const statusColors: Record<string, string> = {
    Received: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
    Logged: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Reviewed: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    Signed: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function InvoicePipeline() {
    const { data: invoices, isLoading } = trpc.invoices.listAll.useQuery();
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

    const lanes = STATUSES.map((status) => ({
        status,
        invoices: (invoices ?? []).filter((inv) => (inv.status ?? "Received") === status),
    }));

    const selectedInvoice = selectedInvoiceId
        ? (invoices ?? []).find((inv) => inv.id === selectedInvoiceId)
        : null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2">Invoice Pipeline</h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                Kanban view of invoice workflow across all projects
            </p>

            <div className="flex gap-4 overflow-x-auto pb-4">
                {lanes.map(({ status, invoices: laneInvoices }) => (
                    <div
                        key={status}
                        className="min-w-[220px] flex-shrink-0 rounded-xl border"
                        style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                    >
                        {/* Column header */}
                        <div
                            className="px-3 py-2.5 border-b rounded-t-xl flex items-center justify-between"
                            style={{ borderColor: "var(--color-border)" }}
                        >
                            <span className="text-sm font-semibold">{status}</span>
                            <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-text-muted)" }}
                            >
                                {laneInvoices.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="p-2 space-y-2 min-h-[120px]">
                            {laneInvoices.length === 0 && (
                                <div className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>
                                    No invoices
                                </div>
                            )}
                            {laneInvoices.map((inv) => (
                                <div
                                    key={inv.id}
                                    onClick={() => setSelectedInvoiceId(selectedInvoiceId === inv.id ? null : inv.id)}
                                    className={`rounded-lg shadow-sm p-3 text-sm border-l-[3px] cursor-pointer hover:shadow-md transition-all ${status === "Paid"
                                        ? "border-l-emerald-500"
                                        : "border-l-blue-600"
                                        } ${selectedInvoiceId === inv.id ? "ring-2 ring-blue-500" : ""}`}
                                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                                >
                                    <div className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                        {inv.invoiceNumber}
                                    </div>
                                    <div className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                                        {inv.vendor || "Unknown vendor"}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="font-semibold text-xs">{formatMoney(inv.totalAmount)}</span>
                                        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                                            {formatDate(inv.dateReceived)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Inline detail panel */}
            {selectedInvoice && (
                <div
                    className="mt-4 rounded-xl border shadow-sm overflow-hidden transition-all"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {selectedInvoice.invoiceNumber}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[selectedInvoice.status ?? "Received"]}`}>
                                {selectedInvoice.status}
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedInvoiceId(null)}
                            className="text-sm hover:text-red-500 transition-colors p-1"
                            style={{ color: "var(--color-text-muted)" }}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Invoice details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Vendor</p>
                                <p className="font-medium">{selectedInvoice.vendor || "Unknown"}</p>
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Amount</p>
                                <p className="font-bold">{formatMoney(selectedInvoice.totalAmount)}</p>
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Date Received</p>
                                <p className="font-medium">{formatDate(selectedInvoice.dateReceived)}</p>
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Date Approved</p>
                                <p className="font-medium">{selectedInvoice.dateApproved ? formatDate(selectedInvoice.dateApproved) : "—"}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Status</p>
                                <p className="font-medium">{selectedInvoice.status}</p>
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Grant Eligible</p>
                                <p className="font-medium">
                                    {selectedInvoice.grantEligible ? (
                                        <span className="text-emerald-600 dark:text-emerald-400">{selectedInvoice.grantCode || "Yes"}</span>
                                    ) : "No"}
                                </p>
                            </div>
                            {(selectedInvoice as any).contract && (
                                <>
                                    <div>
                                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Contract</p>
                                        <p className="font-medium">{(selectedInvoice as any).contract.vendor}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Contract #</p>
                                        <p className="font-medium font-mono text-xs">
                                            <a
                                                href={`#/project/${selectedInvoice.projectId}/contracts`}
                                                className="text-blue-700 dark:text-blue-300 hover:underline"
                                            >{(selectedInvoice as any).contract.contractNumber || "—"}</a>
                                            {" · "}{(selectedInvoice as any).contract.type}
                                            {(selectedInvoice as any).contract.signedDocumentLink && (
                                                <>
                                                    {" · "}
                                                    <a href={(selectedInvoice as any).contract.signedDocumentLink} target="_blank" rel="noopener noreferrer" className={`text-xs ${contractLabel((selectedInvoice as any).contract.signedDocumentLink).className}`}>{contractLabel((selectedInvoice as any).contract.signedDocumentLink).text}</a>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Document links */}
                        {(selectedInvoice.sourcePdfPath || selectedInvoice.signedPdfPath) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Documents</p>
                                    <p className="flex items-center gap-1.5">
                                        {selectedInvoice.sourcePdfPath && (
                                            <a href={selectedInvoice.sourcePdfPath} target="_blank" rel="noopener noreferrer" className={`text-xs ${sourceLabel(selectedInvoice.sourcePdfPath).className}`}>{sourceLabel(selectedInvoice.sourcePdfPath).text}</a>
                                        )}
                                        {selectedInvoice.sourcePdfPath && selectedInvoice.signedPdfPath && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>·</span>}
                                        {selectedInvoice.signedPdfPath && (
                                            <a href={selectedInvoice.signedPdfPath} target="_blank" rel="noopener noreferrer" className={`text-xs ${signedLabel(selectedInvoice.signedPdfPath).className}`}>{signedLabel(selectedInvoice.signedPdfPath).text}</a>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Task breakdowns */}
                        {selectedInvoice.taskBreakdowns && selectedInvoice.taskBreakdowns.length > 0 && (
                            <div className="rounded-lg shadow-sm p-3 space-y-1.5" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Task Breakdowns</p>
                                {selectedInvoice.taskBreakdowns.map((tb) => (
                                    <div key={tb.id} className="flex justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                        <span>
                                            {tb.taskCode && <span className="font-mono mr-2" style={{ color: "var(--color-text-muted)" }}>{tb.taskCode}</span>}
                                            {tb.taskDescription}
                                        </span>
                                        <span className="font-medium">{formatMoney(tb.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Go to project link */}
                        <div className="pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                            <a
                                href={`#/project/${selectedInvoice.projectId}/invoices`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                Go to Project →
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
