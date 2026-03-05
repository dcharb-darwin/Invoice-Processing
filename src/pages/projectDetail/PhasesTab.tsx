import { trpc } from "../../lib/trpc.js";

export default function PhasesTab({ project, onUpdate }: { project: any; onUpdate: () => void }) {
    const updateChecklist = trpc.templates.updatePhaseChecklist.useMutation({
        onSuccess: () => onUpdate(),
    });

    const phases = [...(project.phases || [])].sort((a: any, b: any) => a.order - b.order);

    const toggleItem = (phase: any, itemIndex: number) => {
        const checklist = JSON.parse(phase.checklist || "[]");
        checklist[itemIndex].done = !checklist[itemIndex].done;
        updateChecklist.mutate({ phaseId: phase.id, checklist });
    };

    if (phases.length === 0) {
        return (
            <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-lg mb-2">No phases defined</p>
                <p className="text-sm">Create this project from a template to get 875 Standard phases.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                875 Capital Project File Structure — Phase Tracking
            </p>
            {phases.map((phase: any) => {
                const checklist = JSON.parse(phase.checklist || "[]");
                const doneCount = checklist.filter((c: any) => c.done).length;
                const total = checklist.length;
                const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

                const statusColor =
                    phase.status === "Complete" ? "bg-emerald-500" :
                        phase.status === "In Progress" ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600";

                return (
                    <div
                        key={phase.id}
                        className="rounded-xl border p-4"
                        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                                <h4 className="font-semibold text-sm">{phase.name}</h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800"
                                    style={{ color: "var(--color-text-secondary)" }}>
                                    {phase.status}
                                </span>
                            </div>
                            <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                                {doneCount}/{total} ({pct}%)
                            </span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                            <div
                                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-blue-500"
                                    }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            {checklist.map((item: any, i: number) => (
                                <label
                                    key={i}
                                    className="flex items-center gap-2.5 py-1 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={item.done}
                                        onChange={() => toggleItem(phase, i)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className={`text-sm ${item.done ? "line-through opacity-50" : ""}`}>
                                        {item.item}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
