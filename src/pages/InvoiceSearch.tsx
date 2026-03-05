import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney, formatDate } from "../lib/format.js";
import { projectTabHash } from "../lib/routes.js";
import StatusBadge from "../components/StatusBadge.js";
import SourceDocLink from "../components/SourceDocLink.js";
import InvoiceDocumentLinks from "../components/InvoiceDocumentLinks.js";
import EntityLink from "../components/EntityLink.js";
import TaskBreakdownList from "../components/TaskBreakdownList.js";

/**
 * Invoice search — matches TaskLine light-mode design.
 * [trace: discovery L469-476 — Shannon uses invoice # as primary lookup key]
 */
export default function InvoiceSearch({ onSelectProject }: { onSelectProject: (id: number) => void }) {
    const [query, setQuery] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const { data: results, isLoading } = trpc.invoices.search.useQuery(
        { query: searchTerm },
        { enabled: searchTerm.length > 0 }
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchTerm(query);
        setExpandedId(null);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2">Invoice Search</h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                Search by invoice number across all projects
            </p>

            <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter invoice number (e.g. DEA-2025-001)"
                    className="flex-1 border rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
                <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-sm transition-colors"
                >
                    Search
                </button>
            </form>

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
            )}

            {searchTerm && !isLoading && results?.length === 0 && (
                <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
                    No invoices found matching "{searchTerm}"
                </div>
            )}

            {results && results.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
                        {results.length} result{results.length !== 1 ? "s" : ""}
                    </p>
                    {results.map((inv) => {
                        const isExpanded = expandedId === inv.id;
                        return (
                            <div
                                key={inv.id}
                                className={`rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${isExpanded ? "ring-2 ring-blue-500" : ""}`}
                                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                            >
                                <div
                                    className="p-4"
                                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs transition-transform duration-200" style={{ color: "var(--color-text-muted)", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                                                ▶
                                            </span>
                                            <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                {inv.invoiceNumber}
                                            </span>
                                            <StatusBadge status={inv.status ?? "Received"} />
                                        </div>
                                        <span className="font-bold">{formatMoney(inv.totalAmount)}</span>
                                    </div>
                                    <div className="flex gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                        <span>{inv.vendor || "Unknown vendor"}</span>
                                        <span>Received: {formatDate(inv.dateReceived)}</span>
                                        {inv.grantEligible && (
                                            <span className="text-emerald-600 dark:text-emerald-400">Grant: {inv.grantCode}</span>
                                        )}
                                    </div>
                                    {!isExpanded && inv.taskBreakdowns && inv.taskBreakdowns.length > 0 && (
                                        <div className="mt-2 flex gap-2 flex-wrap">
                                            {inv.taskBreakdowns.map((tb) => (
                                                <span
                                                    key={tb.id}
                                                    className="text-[10px] px-1.5 py-0.5 rounded"
                                                    style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}
                                                >
                                                    {tb.taskCode || tb.taskDescription}: {formatMoney(tb.amount)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Expanded detail section */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 space-y-3">
                                        {/* Full invoice detail */}
                                        <div className="rounded-lg shadow-sm p-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Invoice Details</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Vendor</p>
                                                    <p className="font-medium">{inv.vendor || "Unknown"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Amount</p>
                                                    <p className="font-bold">{formatMoney(inv.totalAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Date Received</p>
                                                    <p className="font-medium">{formatDate(inv.dateReceived)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Date Approved</p>
                                                    <p className="font-medium">{inv.dateApproved ? formatDate(inv.dateApproved) : "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Status</p>
                                                    <p className="font-medium">{inv.status}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Grant Eligible</p>
                                                    <p className="font-medium">
                                                        {inv.grantEligible ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400">{inv.grantCode || "Yes"}</span>
                                                        ) : "No"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contract info */}
                                        {(inv as any).contract && (
                                            <div className="rounded-lg shadow-sm p-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Contract</p>
                                                <div className="grid grid-cols-3 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Vendor</p>
                                                        <p className="font-medium">{(inv as any).contract.vendor}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Number</p>
                                                        <p className="font-medium font-mono text-xs">
                                                            <EntityLink
                                                                href={projectTabHash(inv.projectId, "contracts")}
                                                                className="text-blue-700 dark:text-blue-300 hover:underline"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >{(inv as any).contract.contractNumber || "—"}</EntityLink>
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Type</p>
                                                        <p className="font-medium flex items-center gap-1.5">
                                                            {(inv as any).contract.type}
                                                            {(inv as any).contract.signedDocumentLink && (
                                                                <SourceDocLink
                                                                    path={(inv as any).contract.signedDocumentLink}
                                                                    context="Contract"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Documents */}
                                        {(inv.sourcePdfPath || inv.signedPdfPath) && (
                                            <div className="rounded-lg shadow-sm p-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Documents</p>
                                                <InvoiceDocumentLinks
                                                    sourcePdfPath={inv.sourcePdfPath}
                                                    signedPdfPath={inv.signedPdfPath}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        )}

                                        {/* Task breakdowns */}
                                        {inv.taskBreakdowns && inv.taskBreakdowns.length > 0 && (
                                            <TaskBreakdownList breakdowns={inv.taskBreakdowns} />
                                        )}

                                        {/* View in Project link */}
                                        <div className="pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                                            <EntityLink
                                                href={projectTabHash(inv.projectId, "invoices")}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                View in Project →
                                            </EntityLink>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
