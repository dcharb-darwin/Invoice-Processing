import { formatMoney } from "../lib/format.js";

interface TaskBreakdown {
    id?: number;
    taskCode?: string | null;
    taskDescription?: string | null;
    amount: number;
}

/** Reusable task breakdown list used in invoice detail views. */
export default function TaskBreakdownList({ breakdowns }: { breakdowns: TaskBreakdown[] }) {
    if (breakdowns.length === 0) return null;

    return (
        <div className="rounded-lg shadow-sm p-3 space-y-1.5" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Task Breakdowns</p>
            {breakdowns.map((tb, idx) => (
                <div key={tb.id ?? idx} className="flex justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    <span>
                        {tb.taskCode && <span className="font-mono mr-2" style={{ color: "var(--color-text-muted)" }}>{tb.taskCode}</span>}
                        {tb.taskDescription}
                    </span>
                    <span className="font-medium">{formatMoney(tb.amount)}</span>
                </div>
            ))}
        </div>
    );
}
