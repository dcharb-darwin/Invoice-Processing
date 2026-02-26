import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney, formatDate } from "../lib/format.js";

/**
 * Grant reimbursement package builder — TaskLine-matching design.
 * Shannon selects a project + grant code, builds a printable reimbursement package.
 */
export default function GrantPackage() {
    const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
    const [grantCode, setGrantCode] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const { data: projects } = trpc.projects.list.useQuery();

    const { data: pkg, isLoading } = trpc.grants.generateReimbursementPackage.useQuery(
        { projectId: selectedProjectId as number, grantCode },
        { enabled: submitted && typeof selectedProjectId === "number" && grantCode.length > 0 },
    );

    const handleBuild = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProjectId !== "" && grantCode.trim()) {
            setSubmitted(true);
        }
    };

    // Reset when inputs change
    const handleProjectChange = (id: number | "") => {
        setSelectedProjectId(id);
        setSubmitted(false);
    };
    const handleGrantCodeChange = (code: string) => {
        setGrantCode(code);
        setSubmitted(false);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2">Grant Reimbursement Package</h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                Build a grant reimbursement package from eligible invoices
            </p>

            {/* Build form */}
            <form onSubmit={handleBuild} className="flex gap-3 mb-8 flex-wrap">
                <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectChange(e.target.value ? Number(e.target.value) : "")}
                    className="border rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors min-w-[220px]"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                    <option value="">Select a project…</option>
                    {projects?.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    value={grantCode}
                    onChange={(e) => handleGrantCodeChange(e.target.value)}
                    placeholder="Grant code (e.g. TIB-2025-001)"
                    className="border rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors flex-1 min-w-[200px]"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />

                <button
                    type="submit"
                    disabled={selectedProjectId === "" || !grantCode.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm shadow-sm transition-colors"
                >
                    Build Package
                </button>
            </form>

            {/* Loading */}
            {submitted && isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
            )}

            {/* Results */}
            {submitted && pkg && (
                <div className="space-y-4">
                    {/* Package header card */}
                    <div
                        className="rounded-xl border shadow-sm p-6"
                        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">{pkg.projectName}</h3>
                                <p className="text-sm font-mono text-blue-600 dark:text-blue-400">
                                    Grant: {pkg.grantCode}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                    {formatMoney(pkg.totalAmount)}
                                </p>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                    {pkg.eligibleInvoices.length} eligible invoice{pkg.eligibleInvoices.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                Generated: {formatDate(pkg.generatedDate)}
                            </p>
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                            >
                                🖨️ Print
                            </button>
                        </div>
                    </div>

                    {/* No invoices */}
                    {pkg.eligibleInvoices.length === 0 && (
                        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
                            No grant-eligible invoices found for code "{pkg.grantCode}"
                        </div>
                    )}

                    {/* Invoice list */}
                    {pkg.eligibleInvoices.map((inv, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl border shadow-sm p-4"
                            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                                        {inv.number}
                                    </span>
                                    <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                                        {inv.vendor || "Unknown vendor"}
                                    </span>
                                </div>
                                <span className="font-bold">{formatMoney(inv.amount)}</span>
                            </div>
                            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                Received: {formatDate(inv.date)}
                            </div>
                            {inv.taskBreakdowns.length > 0 && (
                                <div className="mt-2 flex gap-2 flex-wrap">
                                    {inv.taskBreakdowns.map((tb, tbIdx) => (
                                        <span
                                            key={tbIdx}
                                            className="text-[10px] px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-text-muted)" }}
                                        >
                                            {tb.taskCode || tb.taskDescription}: {formatMoney(tb.amount)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
