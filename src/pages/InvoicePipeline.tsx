import { trpc } from "../lib/trpc.js";
import { formatMoney, formatDate } from "../lib/format.js";

const STATUSES = ["Received", "Logged", "Reviewed", "Signed", "Paid"] as const;

export default function InvoicePipeline() {
    const { data: invoices, isLoading } = trpc.invoices.listAll.useQuery();

    const lanes = STATUSES.map((status) => ({
        status,
        invoices: (invoices ?? []).filter((inv) => (inv.status ?? "Received") === status),
    }));

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
                                    className={`rounded-lg shadow-sm p-3 text-sm border-l-[3px] ${
                                        status === "Paid"
                                            ? "border-l-emerald-500"
                                            : "border-l-blue-600"
                                    }`}
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
        </div>
    );
}
