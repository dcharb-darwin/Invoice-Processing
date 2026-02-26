import { useState } from "react";
import { trpc } from "../lib/trpc.js";

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

export default function SyncSettings({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { data: config, refetch } = trpc.syncConfig.get.useQuery(undefined, { enabled: open });
    const updateConfig = trpc.syncConfig.set.useMutation({ onSuccess: () => refetch() });

    const [localMode, setLocalMode] = useState<string | null>(null);
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
            mode: mode as any,
            intervalSeconds: interval,
            enabled,
        });
        setLocalMode(null);
        setLocalInterval(null);
        setLocalEnabled(null);
    };

    if (!open) return null;

    const lastResult = config?.lastAutoSyncResult ? JSON.parse(config.lastAutoSyncResult) : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                    <h2 className="text-lg font-bold">⚙️ Sync Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">Auto-Sync</p>
                            <p className="text-xs text-gray-500">Enable automatic synchronization</p>
                        </div>
                        <button
                            onClick={() => setLocalEnabled(!enabled)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                                }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Mode selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Sync Mode</label>
                        <div className="space-y-2">
                            {SYNC_MODES.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => setLocalMode(m.value)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${mode === m.value
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600"
                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                        } ${!enabled && m.value !== "manual" ? "opacity-40" : ""}`}
                                    disabled={!enabled && m.value !== "manual"}
                                >
                                    <span className="font-medium">{m.label}</span>
                                    <span className="block text-xs text-gray-500 mt-0.5">{m.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interval selector */}
                    {enabled && mode !== "manual" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Poll Interval</label>
                            <select
                                value={interval}
                                onChange={(e) => setLocalInterval(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                                {INTERVALS.map((i) => (
                                    <option key={i.value} value={i.value}>{i.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Last sync info */}
                    {config?.lastAutoSyncAt && (
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-xs space-y-1">
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
                <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || updateConfig.isPending}
                        className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                        {updateConfig.isPending ? "Saving…" : "Save Settings"}
                    </button>
                </div>
            </div>
        </div>
    );
}
