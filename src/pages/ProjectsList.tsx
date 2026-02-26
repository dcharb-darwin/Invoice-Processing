import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney } from "../lib/format.js";

/**
 * Projects list — TaskLine-matching light-mode cards.
 * [trace: dev-plan L66-77 — project listing with budget summary]
 */
export default function ProjectsList({ onSelectProject }: { onSelectProject: (id: number) => void }) {
    const { data: projects, isLoading, error } = trpc.projects.list.useQuery();
    const [exportingId, setExportingId] = useState<number | null>(null);
    const utils = trpc.useUtils();
    const handleExport = async (e: React.MouseEvent, projectId: number) => {
        e.stopPropagation();
        setExportingId(projectId);
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
            setExportingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 p-6 text-red-700 dark:text-red-400">
                Failed to load projects: {error.message}
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Capital Projects</h2>
                    <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                        {projects?.length || 0} active projects · Budget tracking from seeded data
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects?.map((project) => {
                    const totalBudget = project.computed.totalBudget;
                    const totalProjected = project.computed.totalProjected;
                    const pctUsed = totalBudget > 0 ? (totalProjected / totalBudget) * 100 : 0;

                    return (
                        <div
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            className="rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            style={{
                                backgroundColor: "var(--color-surface)",
                                borderColor: "var(--color-border)",
                            }}
                        >
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
                                        CFP #{project.cfpNumber || "—"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="text-xs font-medium px-2 py-0.5 rounded"
                                            style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-text-muted)" }}
                                        >
                                            {project.type || "—"}
                                        </span>
                                        <button
                                            onClick={(e) => handleExport(e, project.id)}
                                            disabled={exportingId === project.id}
                                            className="p-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50"
                                            title="Export .xlsx"
                                        >
                                            {exportingId === project.id ? (
                                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-semibold text-base mb-1 group-hover:text-blue-600 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                                    PM: {project.projectManager || "Unassigned"} · {project.contracts?.length || 0} contracts
                                </p>

                                {/* Budget bar */}
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                                        <span>Projected: {formatMoney(totalProjected)}</span>
                                        <span>Budget: {formatMoney(totalBudget)}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${pctUsed > 95 ? "bg-red-500" :
                                                    pctUsed > 85 ? "bg-amber-500" :
                                                        "bg-emerald-500"
                                                }`}
                                            style={{ width: `${Math.min(pctUsed, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                    {project.budgetLineItems?.map((bli) => (
                                        <span
                                            key={bli.id}
                                            className="text-[10px] px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-text-muted)" }}
                                        >
                                            {bli.category}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
