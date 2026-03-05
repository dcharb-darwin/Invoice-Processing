import { formatMoney, formatDate } from "../lib/format.js";
import StatusBadge from "../components/StatusBadge.js";
import SourceDocLink from "../components/SourceDocLink.js";

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
                className="relative w-full max-w-2xl shadow-2xl overflow-y-auto animate-slide-in-right"
                style={{ animation: "slideInRight 0.25s ease-out", backgroundColor: "var(--color-surface)" }}
            >
                {/* Header */}
                <div
                    className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="transition-colors"
                            style={{ color: "var(--color-text-muted)" }}
                            title="Close panel"
                        >
                            ← Back
                        </button>
                        <h2 className="text-lg font-bold font-mono">{invoice.invoiceNumber}</h2>
                        <StatusBadge status={invoice.status} />
                    </div>
                    <button
                        onClick={onClose}
                        className="text-xl transition-colors"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Temporary disclaimer: data mapping workflow still being finalized with customer */}
                    <div className="rounded-lg border px-4 py-3 bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                        <p className="text-xs font-semibold">Temporary Notice — Requirements/Workflow Review Pending</p>
                        <p className="text-xs mt-1">
                            Source PDF values and recorded IPC values may not yet align 1:1 for all invoices.
                            Final mapping/validation behavior will be confirmed with customer requirements and workflow decisions.
                        </p>
                    </div>

                    {/* Key Facts */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoBlock label="Amount" value={formatMoney(invoice.totalAmount)} large />
                        <InfoBlock label="Vendor" value={invoice.vendor || "—"} />
                        <InfoBlock label="Date Received" value={formatDate(invoice.dateReceived)} />
                        <InfoBlock label="Date Approved" value={formatDate(invoice.dateApproved) || "Pending"} />
                    </div>

                    {/* Contract Link */}
                    {contract && (
                        <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
                            <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Contract</p>
                            <button
                                onClick={() => onNavigateToContract?.(contract.id)}
                                className="text-sm font-semibold hover:underline flex items-center gap-1.5"
                                style={{ color: "var(--color-primary)" }}
                            >
                                {contract.vendor} — {contract.contractNumber || "No #"}
                                <span className="text-xs">→</span>
                            </button>
                            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                                {contract.type} · {formatMoney(contract.originalAmount)}
                            </p>
                        </div>
                    )}

                    {/* Source Documents */}
                    <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
                        <p className="text-xs font-medium mb-3" style={{ color: "var(--color-text-muted)" }}>Source Documents</p>
                        <div className="flex gap-3">
                            {invoice.sourcePdfPath ? (
                                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-current/20 hover:opacity-80">
                                    <SourceDocLink path={invoice.sourcePdfPath} context="Source" />
                                </span>
                            ) : (
                                <span className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>No source document attached</span>
                            )}
                            {invoice.signedPdfPath && (
                                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-current/20 hover:opacity-80">
                                    <SourceDocLink path={invoice.signedPdfPath} context="Signed" />
                                </span>
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
                        <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
                            <p className="text-xs font-medium mb-3" style={{ color: "var(--color-text-muted)" }}>
                                Task Breakdowns ({invoice.taskBreakdowns.length})
                            </p>
                            <div className="space-y-2">
                                {invoice.taskBreakdowns.map((tb: any) => {
                                    const category = getBudgetCategory(tb.budgetLineItemId);
                                    return (
                                        <div
                                            key={tb.id}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg"
                                            style={{ backgroundColor: "var(--color-bg)" }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {tb.taskCode && (
                                                    <span
                                                        className="font-mono text-xs px-1.5 py-0.5 rounded"
                                                        style={{ color: "var(--color-text-muted)", backgroundColor: "var(--color-badge-bg)" }}
                                                    >
                                                        {tb.taskCode}
                                                    </span>
                                                )}
                                                <span className="text-sm">{tb.taskDescription || "Untitled task"}</span>
                                                {category && onNavigateToBudget && (
                                                    <button
                                                        onClick={() => onNavigateToBudget(category)}
                                                        className="text-xs hover:underline"
                                                        style={{ color: "var(--color-primary)" }}
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
                    <div className="text-xs pt-2 border-t space-y-1" style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border-light)" }}>
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

function InfoBlock({ label, value, large }: { label: string; value: string; large?: boolean }) {
    return (
        <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className={`font-semibold ${large ? "text-xl" : "text-sm"}`}>{value}</p>
        </div>
    );
}
