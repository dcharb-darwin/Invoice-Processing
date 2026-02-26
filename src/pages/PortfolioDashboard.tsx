import { trpc } from "../lib/trpc.js";
import { formatMoney, formatPercent } from "../lib/format.js";

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

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div
            className="rounded-xl border shadow-sm p-4"
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

    const rows: PortfolioRow[] = (projects ?? []).map((project) => {
        const p = project as any;
        const budget = Number(p.computed?.totalBudget ?? 0);

        const paidFromComputed = p.computed?.paidToDate ?? p.computed?.totalPaid;
        const paidFromLineItems = Array.isArray(p.budgetLineItems)
            ? p.budgetLineItems.reduce(
                (sum: number, bli: any) => sum + Number(bli?.computed?.paidToDate ?? 0),
                0
            )
            : 0;
        const paid =
            typeof paidFromComputed === "number" ? Number(paidFromComputed) : Number(paidFromLineItems);

        const totalProjected = Number(
            p.computed?.totalProjected ??
            (Array.isArray(p.budgetLineItems)
                ? p.budgetLineItems.reduce(
                    (sum: number, bli: any) => sum + Number(bli?.projectedCost ?? 0),
                    0
                )
                : 0)
        );

        const weightedScope = Array.isArray(p.budgetLineItems)
            ? p.budgetLineItems.reduce((sum: number, bli: any) => {
                const projected = Number(bli?.projectedCost ?? 0);
                const scopePercent = Number(bli?.percentScopeComplete ?? 0);
                return sum + projected * scopePercent;
            }, 0)
            : 0;
        const scopePercent = totalProjected > 0 ? weightedScope / totalProjected : 0;
        const spentPercent = budget > 0 ? (paid / budget) * 100 : 0;

        return {
            id: Number(p.id),
            name: p.name || "Untitled Project",
            projectManager: p.projectManager || "Unassigned",
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                Failed to load portfolio: {error.message}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Portfolio Dashboard</h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    Project-level budget health at a glance
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Total Projects" value={totals.projects.toLocaleString("en-US")} />
                <MetricCard label="Total Budget" value={formatMoney(totals.budget)} />
                <MetricCard label="Total Paid" value={formatMoney(totals.paid)} />
                <MetricCard label="Total Remaining" value={formatMoney(totalRemaining)} />
            </div>

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
                                    onClick={() => onSelectProject(row.id)}
                                    className={`cursor-pointer border-b transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-900/20 ${index % 2 === 1 ? "bg-gray-50/70 dark:bg-slate-800/30" : ""
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
