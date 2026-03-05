import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney, formatPercent } from "../lib/format.js";
import LoadingSpinner from "../components/LoadingSpinner.js";
import ErrorBanner from "../components/ErrorBanner.js";

type HealthTone = "green" | "yellow" | "red";

type PortfolioRow = {
    id: number;
    name: string;
    projectManager: string;
    budget: number;
    paid: number;
    spentPercent: number;
    scopePercent: number;
    health: HealthTone;
};

function getHealth(spentPercent: number, scopePercent: number): HealthTone {
    if (spentPercent > scopePercent + 30) return "red";
    if (spentPercent >= scopePercent + 15) return "yellow";
    return "green";
}

function HealthDot({ tone }: { tone: HealthTone }) {
    const dotClass =
        tone === "red" ? "bg-red-500" : tone === "yellow" ? "bg-amber-500" : "bg-emerald-500";
    const label = tone === "red" ? "Overrun" : tone === "yellow" ? "Watch" : "On Track";

    return (
        <div className="inline-flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {label}
            </span>
        </div>
    );
}

function MetricCard({
    label,
    value,
    onClick,
    className,
}: {
    label: string;
    value: string;
    onClick?: () => void;
    className?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={`rounded-xl border shadow-sm p-4 ${className ?? ""}`}
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                {label}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
    );
}

export default function PortfolioDashboard({
    onSelectProject,
}: {
    onSelectProject: (id: number) => void;
}) {
    const { data: projects, isLoading, error } = trpc.projects.list.useQuery();
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

    // Fetch detail for selected project
    const { data: projectDetail } = trpc.projects.byId.useQuery(
        { id: selectedProjectId! },
        { enabled: selectedProjectId !== null }
    );
    const { data: projectAlerts } = trpc.gutcheck.forProject.useQuery(
        { projectId: selectedProjectId! },
        { enabled: selectedProjectId !== null }
    );

    const rows: PortfolioRow[] = (projects ?? []).map((project) => {
        const budget = project.computed.totalBudget;
        const totalProjected = project.computed.totalProjected;

        // projects.list doesn't include invoice breakdowns, so paid is computed
        // from budgetLineItems' computed fields when available (byId endpoint only)
        const paid = (project.budgetLineItems ?? []).reduce(
            (sum, bli) => sum + ((bli as { computed?: { paidToDate?: number } }).computed?.paidToDate ?? 0),
            0,
        );

        const weightedScope = (project.budgetLineItems ?? []).reduce((sum, bli) => {
            return sum + bli.projectedCost * (bli.percentScopeComplete ?? 0);
        }, 0);
        const scopePercent = totalProjected > 0 ? weightedScope / totalProjected : 0;
        const spentPercent = budget > 0 ? (paid / budget) * 100 : 0;

        return {
            id: project.id,
            name: project.name || "Untitled Project",
            projectManager: project.projectManager || "Unassigned",
            budget,
            paid,
            spentPercent,
            scopePercent,
            health: getHealth(spentPercent, scopePercent),
        };
    });

    const totals = rows.reduce(
        (acc, row) => {
            acc.projects += 1;
            acc.budget += row.budget;
            acc.paid += row.paid;
            return acc;
        },
        { projects: 0, budget: 0, paid: 0 }
    );
    const totalRemaining = totals.budget - totals.paid;

    const handleRowClick = (id: number) => {
        setSelectedProjectId(selectedProjectId === id ? null : id);
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorBanner message={`Failed to load portfolio: ${error.message}`} />;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Portfolio Dashboard</h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    Project-level budget health at a glance
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Projects"
                    value={totals.projects.toLocaleString("en-US")}
                    onClick={() => {
                        window.location.hash = "/";
                    }}
                    className="cursor-pointer hover:shadow-md"
                />
                <MetricCard label="Total Budget" value={formatMoney(totals.budget)} />
                <MetricCard label="Total Paid" value={formatMoney(totals.paid)} />
                <MetricCard label="Total Remaining" value={formatMoney(totalRemaining)} />
            </div>

            {/* Quick-glance detail panel for selected project */}
            {selectedProjectId !== null && projectDetail && (
                <div
                    className="rounded-xl border shadow-sm overflow-hidden transition-all"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-base">{projectDetail.name}</h3>
                            <span className="ipc-cfp-badge">
                                CFP #{projectDetail.cfpNumber}
                            </span>
                            {projectAlerts && projectAlerts.length > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                    {projectAlerts.length} alert{projectAlerts.length !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedProjectId(null)}
                            className="text-sm hover:text-red-500 transition-colors p-1"
                            style={{ color: "var(--color-text-muted)" }}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Summary stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total Budget</p>
                                <p className="font-bold">{formatMoney(projectDetail.computed.totalBudget)}</p>
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total Paid</p>
                                <p className="font-bold">{formatMoney(projectDetail.computed.totalPaid)}</p>
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Contracts</p>
                                <p className="font-bold">{projectDetail.contracts.length}</p>
                            </div>
                            <div>
                                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Invoices</p>
                                <p className="font-bold">{projectDetail.invoices.length}</p>
                            </div>
                        </div>

                        {/* Budget category bars */}
                        {projectDetail.budgetLineItems.length > 0 && (
                            <div className="rounded-lg shadow-sm p-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Budget Categories</p>
                                <div className="space-y-2">
                                    {projectDetail.budgetLineItems.map((bli) => {
                                        const pct = bli.projectedCost > 0 ? (bli.computed.paidToDate / bli.projectedCost) * 100 : 0;
                                        const barColor = pct > 95 ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-blue-500";
                                        return (
                                            <div key={bli.id}>
                                                <div className="flex items-center justify-between text-xs mb-0.5">
                                                    <span style={{ color: "var(--color-text-secondary)" }}>{bli.category}</span>
                                                    <span className="font-medium" style={{ color: "var(--color-text-muted)" }}>
                                                        {formatMoney(bli.computed.paidToDate)} / {formatMoney(bli.projectedCost)}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                                                    <div
                                                        className={`h-full rounded-full transition-all ${barColor}`}
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Open Full Detail button */}
                        <div className="pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                            <button
                                onClick={() => onSelectProject(selectedProjectId)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                Open Full Detail →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="rounded-xl border shadow-sm overflow-hidden"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr
                                className="text-left border-b"
                                style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                            >
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">PM</th>
                                <th className="px-4 py-3 font-medium text-right">Budget</th>
                                <th className="px-4 py-3 font-medium text-right">Paid</th>
                                <th className="px-4 py-3 font-medium text-right">% Spent</th>
                                <th className="px-4 py-3 font-medium">Health</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    onClick={() => handleRowClick(row.id)}
                                    className={`cursor-pointer border-b transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-900/20 ${
                                        selectedProjectId === row.id
                                            ? "bg-blue-50 dark:bg-blue-900/30"
                                            : index % 2 === 1 ? "bg-gray-50/70 dark:bg-slate-800/30" : ""
                                    }`}
                                    style={{ borderColor: "var(--color-border-light)" }}
                                >
                                    <td className="px-4 py-3 font-medium">{row.name}</td>
                                    <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                                        {row.projectManager}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(row.budget)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(row.paid)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {formatPercent(row.spentPercent)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <HealthDot tone={row.health} />
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        className="px-4 py-10 text-center text-sm"
                                        style={{ color: "var(--color-text-muted)" }}
                                        colSpan={6}
                                    >
                                        No projects found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
