import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney, formatDate, formatPercent } from "../lib/format.js";

/**
 * Project detail page — tabbed view with budget, contracts, invoices, funding, ROW.
 * Restyled to match TaskLine: light mode default, white cards, subtle borders.
 * [trace: dev-plan L239-240 — per-project budget dashboard, live BTR layout]
 * [trace: skill gutcheck-engine — green/yellow/red visual indicators]
 */

type Tab = "budget" | "contracts" | "invoices" | "funding" | "parcels";

const TAB_MAP: Record<string, Tab> = {
    budget: "budget",
    contracts: "contracts",
    invoices: "invoices",
    funding: "funding",
    row: "parcels",
    parcels: "parcels",
};

export default function ProjectDetail({
    projectId,
    onBack,
    initialTab,
}: {
    projectId: number;
    onBack: () => void;
    initialTab?: string;
}) {
    // Derive active tab from URL hash on mount (most robust — hash is source of truth)
    const getTabFromHash = (): Tab => {
        const hash = window.location.hash.slice(1);
        const parts = hash.split("/");
        const tabSegment = parts[3]; // e.g. "invoices", "contracts", "funding", "row"
        return (tabSegment && TAB_MAP[tabSegment]) || "budget";
    };

    const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash);
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);
    const [flashBliId, setFlashBliId] = useState<number | null>(null);
    const budgetTableRef = useRef<HTMLDivElement>(null);

    // Also sync if hash changes while mounted (e.g. user clicks pipeline card while already on detail)
    useEffect(() => {
        const onHashChange = () => {
            const newTab = getTabFromHash();
            setActiveTab(newTab);
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const { data: project, isLoading, refetch } = trpc.projects.byId.useQuery({ id: projectId });
    const { data: alerts } = trpc.gutcheck.forProject.useQuery({ projectId });
    const createInvoice = trpc.invoices.create.useMutation({ onSuccess: () => { refetch(); setShowInvoiceForm(false); } });
    const addSupplement = trpc.contracts.addSupplement.useMutation({ onSuccess: () => refetch() });
    const createFunding = trpc.fundingSources.create.useMutation({ onSuccess: () => refetch() });

    const handleAlertClick = useCallback((alert: any) => {
        setActiveTab("budget");
        if (alert.type === "budget_line_item" && alert.entityId) {
            setFlashBliId(alert.entityId);
            setTimeout(() => setFlashBliId(null), 1500);
        }
        setTimeout(() => budgetTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }, []);

    const handleBudgetRowClick = useCallback(() => {
        setActiveTab("contracts");
    }, []);

    const [exporting, setExporting] = useState(false);
    const utils = trpc.useUtils();
    const handleExport = async () => {
        setExporting(true);
        try {
            const data = await utils.export.projectToXlsx.fetch({ projectId });
            const byteCharacters = atob(data.base64);
            const byteArray = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteArray[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    if (isLoading || !project) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: "budget", label: "Budget Summary", count: project.budgetLineItems.length },
        { key: "contracts", label: "Contracts", count: project.contracts.length },
        { key: "invoices", label: "Invoices", count: project.invoices.length },
        { key: "funding", label: "Funding Sources", count: project.fundingSources.length },
        { key: "parcels", label: "ROW Parcels", count: project.rowParcels.length },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="hover:text-blue-600 transition-colors text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    ← Back
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold">{project.name}</h2>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
                            CFP #{project.cfpNumber}
                        </span>
                        <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-text-muted)" }}
                        >
                            {project.type} · {project.status}
                        </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        PM: {project.projectManager} · #{project.projectNumber}
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                    {exporting ? "Exporting…" : "Export .xlsx"}
                </button>
            </div>

            {/* Gut-Check Alerts */}
            {alerts && alerts.length > 0 && (
                <div className="mb-6 space-y-2">
                    {alerts.map((alert, i) => (
                        <div
                            key={i}
                            onClick={() => handleAlertClick(alert)}
                            className={`rounded-lg px-4 py-3 text-sm flex items-center gap-3 border cursor-pointer transition-colors ${alert.severity === "red"
                                ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/20"
                                : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/20"
                                }`}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${alert.severity === "red" ? "bg-red-500" : "bg-amber-500"
                                }`} />
                            <span className="font-medium">{alert.entityName}:</span>
                            {alert.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard label="Total Budget" value={formatMoney(project.computed.totalBudget)} />
                <SummaryCard label="Total Projected" value={formatMoney(project.computed.totalProjected)} />
                <SummaryCard label="Total Paid" value={formatMoney(project.computed.totalPaid)}
                    accent={project.computed.totalPaid > project.computed.totalBudget * 0.85 ? "warning" : "default"} />
                <SummaryCard
                    label="Remaining"
                    value={formatMoney(project.computed.totalBudget - project.computed.totalPaid)}
                    accent={project.computed.totalPaid > project.computed.totalBudget * 0.95 ? "danger" : "default"}
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b overflow-x-auto" style={{ borderColor: "var(--color-border)" }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                            ? "border-blue-600 text-blue-700 dark:text-blue-300"
                            : "border-transparent hover:text-blue-600"
                            }`}
                        style={activeTab !== tab.key ? { color: "var(--color-text-secondary)" } : undefined}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className="ml-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>({tab.count})</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "budget" && <BudgetTab project={project} alerts={alerts || []} budgetTableRef={budgetTableRef} flashBliId={flashBliId} onRowClick={handleBudgetRowClick} />}
            {activeTab === "contracts" && <ContractsTab project={project} onAddSupplement={addSupplement.mutate} />}
            {activeTab === "invoices" && (
                <InvoicesTab
                    project={project}
                    showForm={showInvoiceForm}
                    onToggleForm={() => setShowInvoiceForm(!showInvoiceForm)}
                    onCreateInvoice={createInvoice.mutate}
                />
            )}
            {activeTab === "funding" && <FundingTab project={project} onCreateFunding={createFunding.mutate} />}
            {activeTab === "parcels" && <ParcelsTab project={project} />}
        </div>
    );
}

function SummaryCard({ label, value, accent = "default" }: { label: string; value: string; accent?: "default" | "warning" | "danger" }) {
    const borderClass = accent === "danger"
        ? "border-red-200 dark:border-red-500/30"
        : accent === "warning"
            ? "border-amber-200 dark:border-amber-500/30"
            : "";
    return (
        <div
            className={`rounded-xl border shadow-sm p-4 ${borderClass}`}
            style={{ backgroundColor: "var(--color-surface)", borderColor: borderClass ? undefined : "var(--color-border)" }}
        >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-lg font-bold">{value}</p>
        </div>
    );
}

function BudgetTab({ project, alerts, budgetTableRef, flashBliId, onRowClick }: {
    project: any; alerts: any[]; budgetTableRef: React.RefObject<HTMLDivElement | null>; flashBliId: number | null; onRowClick: () => void;
}) {
    return (
        <div
            ref={budgetTableRef}
            className="rounded-xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-left text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium text-right">Projected</th>
                        <th className="px-4 py-3 font-medium text-right">Paid to Date</th>
                        <th className="px-4 py-3 font-medium text-right">Balance</th>
                        <th className="px-4 py-3 font-medium text-right">% Spent</th>
                        <th className="px-4 py-3 font-medium text-right">% Scope</th>
                        <th className="px-4 py-3 font-medium text-center">Health</th>
                        <th className="px-4 py-3 font-medium text-center" style={{ width: "40px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {project.budgetLineItems.map((bli: any) => {
                        const alert = alerts.find((a) => a.type === "budget_line_item" && a.entityId === bli.id);
                        const healthColor = alert
                            ? alert.severity === "red" ? "bg-red-500" : "bg-amber-500"
                            : "bg-emerald-500";
                        const isFlashing = flashBliId === bli.id;
                        return (
                            <tr
                                key={bli.id}
                                onClick={onRowClick}
                                className={`border-b cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 ${isFlashing ? "animate-flash-yellow" : ""}`}
                                style={{ borderColor: "var(--color-border-light)" }}
                            >
                                <td className="px-4 py-3 font-medium">{bli.category}</td>
                                <td className="px-4 py-3 text-right" style={{ color: "var(--color-text-secondary)" }}>{formatMoney(bli.projectedCost)}</td>
                                <td className="px-4 py-3 text-right" style={{ color: "var(--color-text-secondary)" }}>{formatMoney(bli.computed.paidToDate)}</td>
                                <td className={`px-4 py-3 text-right ${bli.computed.balanceRemaining < 0 ? "text-red-600 dark:text-red-400" : ""}`}
                                    style={bli.computed.balanceRemaining >= 0 ? { color: "var(--color-text-secondary)" } : undefined}>
                                    {formatMoney(bli.computed.balanceRemaining)}
                                </td>
                                <td className="px-4 py-3 text-right" style={{ color: "var(--color-text-secondary)" }}>{formatPercent(bli.computed.percentSpent)}</td>
                                <td className="px-4 py-3 text-right" style={{ color: "var(--color-text-secondary)" }}>{formatPercent(bli.percentScopeComplete ?? 0)}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-block w-3 h-3 rounded-full ${healthColor}`} title={alert?.message || "On track"} />
                                </td>
                                <td className="px-4 py-3 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>→</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t font-semibold" style={{ borderColor: "var(--color-border)" }}>
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right">{formatMoney(project.computed.totalProjected)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(project.computed.totalPaid)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(project.computed.totalProjected - project.computed.totalPaid)}</td>
                        <td className="px-4 py-3 text-right">
                            {project.computed.totalProjected > 0
                                ? formatPercent((project.computed.totalPaid / project.computed.totalProjected) * 100)
                                : "—"}
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

function ContractsTab({ project, onAddSupplement }: { project: any; onAddSupplement: any }) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div className="space-y-4">
            {project.contracts.map((contract: any) => {
                const supplementTotal = contract.supplements?.reduce((s: number, sup: any) => s + sup.amount, 0) || 0;
                const cumulativeTotal = contract.originalAmount + supplementTotal;
                const contractInvoices = project.invoices.filter((inv: any) => inv.contractId === contract.id);
                const invoiceTotal = contractInvoices.reduce((s: number, inv: any) => s + inv.totalAmount, 0);
                const isExpanded = expandedId === contract.id;

                return (
                    <div
                        key={contract.id}
                        className="rounded-xl border shadow-sm cursor-pointer hover:shadow-md transition-all"
                        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                        onClick={() => setExpandedId(isExpanded ? null : contract.id)}
                    >
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs transition-transform duration-200" style={{ color: "var(--color-text-muted)", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                                        ▶
                                    </span>
                                    <div>
                                        <h4 className="font-semibold text-base">{contract.vendor}</h4>
                                        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                            {contract.contractNumber || "No contract #"} · {contract.type}
                                            {contract.signedDocumentLink && (
                                                <>
                                                    {" · "}
                                                    <a href={contract.signedDocumentLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>📄 Contract</a>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${invoiceTotal > cumulativeTotal
                                    ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    }`}>
                                    {invoiceTotal > cumulativeTotal ? "Over" : "On Track"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Original</p>
                                    <p className="font-medium">{formatMoney(contract.originalAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Cumulative</p>
                                    <p className="font-medium">{formatMoney(cumulativeTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Invoiced</p>
                                    <p className={`font-medium ${invoiceTotal > cumulativeTotal ? "text-red-600 dark:text-red-400" : ""}`}>
                                        {formatMoney(invoiceTotal)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="px-5 pb-5 space-y-3">
                                {contract.supplements?.length > 0 && (
                                    <div className="rounded-lg shadow-sm p-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                        <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Supplements</p>
                                        <div className="space-y-1">
                                            {contract.supplements.map((sup: any) => (
                                                <div key={sup.id} className="flex justify-between text-sm" style={{ color: "var(--color-text-secondary)" }}>
                                                    <span className="flex items-center gap-1.5">
                                                        #{sup.supplementNumber} — {sup.description || "No description"}
                                                        {sup.signedDocumentLink && (
                                                            <a href={sup.signedDocumentLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>📄</a>
                                                        )}
                                                    </span>
                                                    <span className="font-medium">{formatMoney(sup.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {contractInvoices.length > 0 && (
                                    <div className="rounded-lg shadow-sm p-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                        <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Invoices ({contractInvoices.length})</p>
                                        <div className="space-y-1.5">
                                            {contractInvoices.map((inv: any) => (
                                                <div key={inv.id} className="flex items-center justify-between text-sm" style={{ color: "var(--color-text-secondary)" }}>
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`#/project/${project.id}/invoices`}
                                                            className="font-mono text-xs text-blue-700 dark:text-blue-300 hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >{inv.invoiceNumber}</a>
                                                        <StatusBadge status={inv.status} />
                                                        {inv.sourcePdfPath && (
                                                            <a href={inv.sourcePdfPath} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>📄 Source</a>
                                                        )}
                                                    </div>
                                                    <span className="font-medium">{formatMoney(inv.totalAmount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!contract.supplements?.length && contractInvoices.length === 0 && (
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No supplements or invoices.</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function InvoicesTab({ project, showForm, onToggleForm, onCreateInvoice }: {
    project: any; showForm: boolean; onToggleForm: () => void; onCreateInvoice: any;
}) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{project.invoices.length} invoices</p>
                <button
                    onClick={onToggleForm}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                >
                    {showForm ? "Cancel" : "+ Add Invoice"}
                </button>
            </div>

            {showForm && <InvoiceForm project={project} onSubmit={onCreateInvoice} />}

            <div className="space-y-3">
                {project.invoices.map((inv: any) => {
                    const isExpanded = expandedId === inv.id;
                    const hasBreakdowns = inv.taskBreakdowns?.length > 0;
                    return (
                        <div
                            key={inv.id}
                            className={`rounded-xl border shadow-sm transition-all ${hasBreakdowns ? "cursor-pointer hover:shadow-md" : ""}`}
                            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                            onClick={() => hasBreakdowns && setExpandedId(isExpanded ? null : inv.id)}
                        >
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                                            {inv.invoiceNumber}
                                        </span>
                                        <StatusBadge status={inv.status} />
                                        {(inv.sourcePdfPath || inv.signedPdfPath) && (
                                            <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                {inv.sourcePdfPath && (
                                                    <a href={inv.sourcePdfPath} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 hover:underline">📄 Source</a>
                                                )}
                                                {inv.sourcePdfPath && inv.signedPdfPath && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>·</span>}
                                                {inv.signedPdfPath && (
                                                    <a href={inv.signedPdfPath} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 hover:underline">✅ Signed</a>
                                                )}
                                            </span>
                                        )}
                                        {hasBreakdowns && (
                                            <span className="text-xs transition-transform duration-200" style={{ color: "var(--color-text-muted)", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                                                ▶
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-bold">{formatMoney(inv.totalAmount)}</span>
                                </div>
                                <div className="flex gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                    <span>{inv.vendor}</span>
                                    <span>Received: {formatDate(inv.dateReceived)}</span>
                                    {inv.dateApproved && <span>Approved: {formatDate(inv.dateApproved)}</span>}
                                    {inv.grantEligible && (
                                        <span className="text-emerald-600 dark:text-emerald-400">Grant: {inv.grantCode}</span>
                                    )}
                                </div>
                            </div>

                            {isExpanded && hasBreakdowns && (
                                <div className="px-4 pb-4">
                                    <div className="rounded-lg shadow-sm p-3 space-y-1.5" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                        <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Task Breakdowns</p>
                                        {inv.taskBreakdowns.map((tb: any) => (
                                            <div key={tb.id} className="flex justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                                <span>
                                                    {tb.taskCode && <span className="font-mono mr-2" style={{ color: "var(--color-text-muted)" }}>{tb.taskCode}</span>}
                                                    {tb.taskDescription}
                                                </span>
                                                <span className="font-medium">{formatMoney(tb.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function InvoiceForm({ project, onSubmit }: { project: any; onSubmit: any }) {
    const [form, setForm] = useState({
        invoiceNumber: "", vendor: "", totalAmount: "",
        dateReceived: new Date().toISOString().split("T")[0],
        contractId: project.contracts[0]?.id || 0,
        status: "Received" as const, grantEligible: false, grantCode: "",
    });
    const [breakdowns, setBreakdowns] = useState<{ budgetLineItemId: number; taskCode: string; taskDescription: string; amount: string }[]>([]);

    const addBreakdown = () => {
        setBreakdowns([...breakdowns, {
            budgetLineItemId: project.budgetLineItems[0]?.id || 0,
            taskCode: "", taskDescription: "", amount: "",
        }]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            projectId: project.id,
            contractId: form.contractId || undefined,
            invoiceNumber: form.invoiceNumber, vendor: form.vendor,
            totalAmount: Math.round(parseFloat(form.totalAmount || "0") * 100),
            dateReceived: form.dateReceived, status: form.status,
            grantEligible: form.grantEligible, grantCode: form.grantCode || undefined,
            taskBreakdowns: breakdowns.map((b) => ({
                budgetLineItemId: b.budgetLineItemId,
                taskCode: b.taskCode || undefined, taskDescription: b.taskDescription || undefined,
                amount: Math.round(parseFloat(b.amount || "0") * 100),
            })),
        });
    };

    const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";
    const selectClass = inputClass;

    return (
        <form onSubmit={handleSubmit}
            className="rounded-xl border shadow-sm p-5 mb-6 space-y-4"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
            <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300">New Invoice</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormInput label="Invoice #" value={form.invoiceNumber} onChange={(v) => setForm({ ...form, invoiceNumber: v })} required />
                <FormInput label="Vendor" value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} />
                <FormInput label="Total Amount ($)" value={form.totalAmount} onChange={(v) => setForm({ ...form, totalAmount: v })} type="number" required />
                <FormInput label="Date Received" value={form.dateReceived} onChange={(v) => setForm({ ...form, dateReceived: v })} type="date" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Contract</label>
                    <select value={form.contractId} onChange={(e) => setForm({ ...form, contractId: parseInt(e.target.value) })}
                        className={selectClass} style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                        <option value={0}>None</option>
                        {project.contracts.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.vendor} ({c.type})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        className={selectClass} style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                        {["Received", "Logged", "Reviewed", "Signed", "Paid"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.grantEligible}
                            onChange={(e) => setForm({ ...form, grantEligible: e.target.checked })} className="rounded" />
                        Grant Eligible
                    </label>
                </div>
                {form.grantEligible && (
                    <FormInput label="Grant Code" value={form.grantCode} onChange={(v) => setForm({ ...form, grantCode: v })} />
                )}
            </div>

            {/* Task Breakdowns */}
            <div className="border-t pt-3" style={{ borderColor: "var(--color-border-light)" }}>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Task Breakdowns</p>
                    <button type="button" onClick={addBreakdown} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Task</button>
                </div>
                {breakdowns.map((b, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                        <select value={b.budgetLineItemId}
                            onChange={(e) => { const u = [...breakdowns]; u[i].budgetLineItemId = parseInt(e.target.value); setBreakdowns(u); }}
                            className="border rounded-lg px-2 py-1.5 text-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                            {project.budgetLineItems.map((bli: any) => (
                                <option key={bli.id} value={bli.id}>{bli.category}</option>
                            ))}
                        </select>
                        <input placeholder="Task code" value={b.taskCode}
                            onChange={(e) => { const u = [...breakdowns]; u[i].taskCode = e.target.value; setBreakdowns(u); }}
                            className="border rounded-lg px-2 py-1.5 text-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }} />
                        <input placeholder="Description" value={b.taskDescription}
                            onChange={(e) => { const u = [...breakdowns]; u[i].taskDescription = e.target.value; setBreakdowns(u); }}
                            className="border rounded-lg px-2 py-1.5 text-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }} />
                        <input placeholder="Amount ($)" type="number" value={b.amount}
                            onChange={(e) => { const u = [...breakdowns]; u[i].amount = e.target.value; setBreakdowns(u); }}
                            className="border rounded-lg px-2 py-1.5 text-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }} />
                    </div>
                ))}
            </div>

            <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors">
                Save Invoice
            </button>
        </form>
    );
}

function FundingTab({ project, onCreateFunding }: { project: any; onCreateFunding: any }) {
    return (
        <div className="space-y-3">
            {project.fundingSources.map((fs: any) => {
                const years = fs.yearAllocations ? JSON.parse(fs.yearAllocations) : {};
                return (
                    <div key={fs.id} className="rounded-xl border shadow-sm p-4"
                        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{fs.sourceName}</h4>
                            <span className="font-bold">{formatMoney(fs.allocatedAmount)}</span>
                        </div>
                        {fs.springbrookBudgetCode && (
                            <p className="text-xs font-mono mb-2" style={{ color: "var(--color-text-muted)" }}>{fs.springbrookBudgetCode}</p>
                        )}
                        {Object.keys(years).length > 0 && (
                            <div className="flex gap-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                {Object.entries(years).map(([year, amt]) => (
                                    <span key={year}>{year}: {formatMoney(amt as number)}</span>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ParcelsTab({ project }: { project: any }) {
    if (project.rowParcels.length === 0) {
        return <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No ROW parcels recorded.</p>;
    }
    return (
        <div className="rounded-xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-left text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                        <th className="px-4 py-3 font-medium">Parcel #</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {project.rowParcels.map((p: any) => (
                        <tr key={p.id} className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                            <td className="px-4 py-3 font-mono">{p.parcelNumber}</td>
                            <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{p.expenditureType}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatMoney(p.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        Received: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
        Logged: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        Reviewed: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        Signed: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[status] || colors.Received}`}>
            {status}
        </span>
    );
}

function FormInput({ label, value, onChange, type = "text", required = false }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
    return (
        <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }} />
        </div>
    );
}
