import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import ModalShell from "../components/ModalShell.js";

/**
 * Sync Settings modal — configure auto-sync between TaskLine and IPC.
 * [trace: auto-sync PRD — sync mode, interval, enable/disable]
 */

const SYNC_MODES = [
    { value: "manual", label: "Manual", desc: "No auto-sync. Use Import/Push buttons." },
    { value: "auto_taskline_to_ipc", label: "Auto: TaskLine → IPC", desc: "Poll TaskLine for changes, auto-update IPC projects." },
    { value: "auto_ipc_to_taskline", label: "Auto: IPC → TaskLine", desc: "Auto-push IPC changes to TaskLine." },
    { value: "auto_bidirectional", label: "Auto: Bidirectional", desc: "Sync both directions. Last-write-wins." },
] as const;

const INTERVALS = [
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 300, label: "5 minutes" },
    { value: 900, label: "15 minutes" },
];
type SyncMode = (typeof SYNC_MODES)[number]["value"];

export default function SyncSettings({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { data: config, refetch } = trpc.syncConfig.get.useQuery(undefined, { enabled: open });
    const { data: tasklineConnection } = trpc.sync.connectionStatus.useQuery(undefined, { enabled: open });
    const updateConfig = trpc.syncConfig.set.useMutation({ onSuccess: () => refetch() });

    const [localMode, setLocalMode] = useState<SyncMode | null>(null);
    const [localInterval, setLocalInterval] = useState<number | null>(null);
    const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);

    // Use local state if changed, otherwise use server state
    const mode = localMode ?? config?.mode ?? "manual";
    const interval = localInterval ?? config?.intervalSeconds ?? 60;
    const enabled = localEnabled ?? config?.enabled ?? false;

    const hasChanges =
        (localMode !== null && localMode !== config?.mode) ||
        (localInterval !== null && localInterval !== config?.intervalSeconds) ||
        (localEnabled !== null && localEnabled !== config?.enabled);

    const handleSave = () => {
        updateConfig.mutate({
            mode,
            intervalSeconds: interval,
            enabled,
        });
        setLocalMode(null);
        setLocalInterval(null);
        setLocalEnabled(null);
    };

    const lastResult = config?.lastAutoSyncResult ? JSON.parse(config.lastAutoSyncResult) : null;
    const labelStyle = { color: "var(--color-text-secondary)" };
    const helperStyle = { color: "var(--color-text-muted)" };
    const inputStyle = {
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        color: "var(--color-text)",
    };

    return (
        <ModalShell
            open={open}
            onClose={onClose}
            panelClassName="rounded-2xl shadow-2xl max-w-lg w-full mx-4"
        >
                {/* Header */}
                <div className="px-6 py-4 rounded-t-2xl flex items-center justify-between border-b" style={{ borderColor: "var(--color-border)" }}>
                    <h2 className="text-lg font-bold">⚙️ Sync Settings</h2>
                    <button onClick={onClose} className="text-xl hover:text-red-500" style={{ color: "var(--color-text-muted)" }}>✕</button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* TaskLine connection status */}
                    {tasklineConnection && (
                        <div
                            className="rounded-lg border p-3 text-xs"
                            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}
                        >
                            <div className="flex items-center justify-between">
                                <p className="font-medium">TaskLine Connection</p>
                                <span
                                    className={`px-2 py-0.5 rounded ${tasklineConnection.ok
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                        }`}
                                >
                                    {tasklineConnection.ok ? "Healthy" : "Issue"}
                                </span>
                            </div>
                            <p className="mt-1" style={helperStyle}>
                                {tasklineConnection.userMessage}
                            </p>
                            <p className="mt-1" style={helperStyle}>
                                Target: {tasklineConnection.tasklineUrl}
                            </p>
                        </div>
                    )}

                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">Auto-Sync</p>
                            <p className="text-xs" style={helperStyle}>Enable automatic synchronization</p>
                        </div>
                        <button
                            onClick={() => setLocalEnabled(!enabled)}
                            className="relative w-11 h-6 rounded-full transition-colors"
                            style={{ backgroundColor: enabled ? "var(--color-primary)" : "var(--color-border)" }}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Mode selector */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={labelStyle}>Sync Mode</label>
                        <div className="space-y-2">
                            {SYNC_MODES.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => setLocalMode(m.value)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${!enabled && m.value !== "manual" ? "opacity-40" : ""}`}
                                    style={mode === m.value
                                        ? { backgroundColor: "var(--color-badge-bg)", borderColor: "var(--color-primary)" }
                                        : { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                                    disabled={!enabled && m.value !== "manual"}
                                >
                                    <span className="font-medium">{m.label}</span>
                                    <span className="block text-xs mt-0.5" style={helperStyle}>{m.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interval selector */}
                    {enabled && mode !== "manual" && (
                        <div>
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>Poll Interval</label>
                            <select
                                value={interval}
                                onChange={(e) => setLocalInterval(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            >
                                {INTERVALS.map((i) => (
                                    <option key={i.value} value={i.value}>{i.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Last sync info */}
                    {config?.lastAutoSyncAt && (
                        <div
                            className="rounded-lg p-3 text-xs space-y-1 border"
                            style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border-light)" }}
                        >
                            <p><span className="font-medium">Last auto-sync:</span> {new Date(config.lastAutoSyncAt).toLocaleString()}</p>
                            {lastResult && (
                                <p>
                                    <span className="font-medium">Result:</span>{" "}
                                    {lastResult.synced} projects synced
                                    {lastResult.errors?.length > 0 && `, ${lastResult.errors.length} errors`}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-surface)" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || updateConfig.isPending}
                        className="px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                    >
                        {updateConfig.isPending ? "Saving…" : "Save Settings"}
                    </button>
                </div>
        </ModalShell>
    );
}
