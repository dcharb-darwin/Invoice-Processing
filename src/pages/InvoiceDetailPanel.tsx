import { formatMoney, formatDate } from "../lib/format.js";
import { sourceLabel, signedLabel } from "../lib/sourceLabels.js";

/**
 * Invoice Detail Panel — slide-in detail view with source drill-through.
 * Shows full invoice metadata + source PDF link, with cross-tab navigation.
 *
 * Design principle: every data element with source material must be clickable
 * to drill into its source, with easy navigation back.
 *
 * [trace: drill-through PRD — reusable detail panel]
 */

interface InvoiceDetailPanelProps {
    invoice: any;
    project: any;
    onClose: () => void;
    onNavigateToContract?: (contractId: number) => void;
    onNavigateToBudget?: (category: string) => void;
}

export default function InvoiceDetailPanel({
    invoice,
    project,
    onClose,
    onNavigateToContract,
    onNavigateToBudget,
}: InvoiceDetailPanelProps) {
    if (!invoice) return null;

    // Find contract name
    const contract = project?.contracts?.find((c: any) => c.id === invoice.contractId);
    // Map budget line item IDs from task breakdowns to categories
    const getBudgetCategory = (bliId: number) => {
        const bli = project?.budgetLineItems?.find((b: any) => b.id === bliId);
        return bli?.category || null;
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="relative w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto animate-slide-in-right"
                style={{ animation: "slideInRight 0.25s ease-out" }}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Close panel"
                        >
                            ← Back
                        </button>
                        <h2 className="text-lg font-bold font-mono">{invoice.invoiceNumber}</h2>
                        <StatusBadge status={invoice.status} />
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Key Facts */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoBlock label="Amount" value={formatMoney(invoice.totalAmount)} large />
                        <InfoBlock label="Vendor" value={invoice.vendor || "—"} />
                        <InfoBlock label="Date Received" value={formatDate(invoice.dateReceived)} />
                        <InfoBlock label="Date Approved" value={formatDate(invoice.dateApproved) || "Pending"} />
                    </div>

                    {/* Contract Link */}
                    {contract && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contract</p>
                            <button
                                onClick={() => onNavigateToContract?.(contract.id)}
                                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                            >
                                {contract.vendor} — {contract.contractNumber || "No #"}
                                <span className="text-xs">→</span>
                            </button>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {contract.type} · {formatMoney(contract.originalAmount)}
                            </p>
                        </div>
                    )}

                    {/* Source Documents */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Source Documents</p>
                        <div className="flex gap-3">
                            {invoice.sourcePdfPath ? (
                                <a
                                    href={invoice.sourcePdfPath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${sourceLabel(invoice.sourcePdfPath).className} border border-current/20 hover:opacity-80`}
                                >
                                    📄 Source Invoice
                                </a>
                            ) : (
                                <span className="text-xs text-gray-400 italic">No source document attached</span>
                            )}
                            {invoice.signedPdfPath && (
                                <a
                                    href={invoice.signedPdfPath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${signedLabel(invoice.signedPdfPath).className} border border-current/20 hover:opacity-80`}
                                >
                                    ✍️ Signed Copy
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Grant Info */}
                    {invoice.grantEligible && (
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Grant Eligible</p>
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                {invoice.grantCode || "Grant code not specified"}
                            </p>
                        </div>
                    )}

                    {/* Task Breakdowns */}
                    {invoice.taskBreakdowns?.length > 0 && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                                Task Breakdowns ({invoice.taskBreakdowns.length})
                            </p>
                            <div className="space-y-2">
                                {invoice.taskBreakdowns.map((tb: any) => {
                                    const category = getBudgetCategory(tb.budgetLineItemId);
                                    return (
                                        <div key={tb.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                            <div className="flex items-center gap-2">
                                                {tb.taskCode && (
                                                    <span className="font-mono text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                        {tb.taskCode}
                                                    </span>
                                                )}
                                                <span className="text-sm">{tb.taskDescription || "Untitled task"}</span>
                                                {category && onNavigateToBudget && (
                                                    <button
                                                        onClick={() => onNavigateToBudget(category)}
                                                        className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline"
                                                        title={`View ${category} budget line`}
                                                    >
                                                        → {category}
                                                    </button>
                                                )}
                                            </div>
                                            <span className="font-medium text-sm">{formatMoney(tb.amount)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                        <p>Invoice ID: {invoice.id}</p>
                        {invoice.createdAt && <p>Created: {new Date(invoice.createdAt).toLocaleString()}</p>}
                    </div>
                </div>
            </div>

            {/* Slide-in animation */}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}

// ============================================================
// Shared sub-components
// ============================================================

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        Received: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        Approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-600"}`}>
            {status}
        </span>
    );
}

function InfoBlock({ label, value, large }: { label: string; value: string; large?: boolean }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
            <p className={`font-semibold ${large ? "text-xl" : "text-sm"}`}>{value}</p>
        </div>
    );
}
