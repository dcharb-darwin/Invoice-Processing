import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney } from "../lib/format.js";

function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                reject(new Error("Invalid file read result"));
                return;
            }
            const base64 = reader.result.split(",")[1];
            if (!base64) {
                reject(new Error("Invalid file format"));
                return;
            }
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

export default function ReconciliationHub() {
    const [financeFile, setFinanceFile] = useState<File | null>(null);
    const [snapshotId, setSnapshotId] = useState<number | null>(null);
    const [toast, setToast] = useState<string>("");
    const [sourceName, setSourceName] = useState("");
    const [sourceType, setSourceType] = useState<"local_file" | "public_url">("local_file");
    const [sourceLocation, setSourceLocation] = useState("");
    const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
    const [activeRunId, setActiveRunId] = useState<number | null>(null);

    const utils = trpc.useUtils();
    const importSnapshot = trpc.financeReconciliation.importSnapshot.useMutation({
        onSuccess: async (result) => {
            setSnapshotId(result.snapshotId);
            await utils.financeReconciliation.deltaReport.invalidate();
            setToast(`Imported finance snapshot (${result.parsedProjects} rows).`);
        },
    });
    const { data: deltaReport } = trpc.financeReconciliation.deltaReport.useQuery(
        snapshotId ? { snapshotId } : undefined,
    );

    const upsertSource = trpc.publicIngest.upsertSource.useMutation({
        onSuccess: async () => {
            await utils.publicIngest.listSources.invalidate();
            setSourceName("");
            setSourceLocation("");
        },
    });
    const { data: sources } = trpc.publicIngest.listSources.useQuery();
    const runIngest = trpc.publicIngest.run.useMutation({
        onSuccess: (result) => {
            setActiveRunId(result.runId);
            setToast(`Public ingest run ${result.runId} started.`);
        },
    });
    const { data: runReport } = trpc.publicIngest.runReport.useQuery(
        { runId: activeRunId ?? -1 },
        { enabled: !!activeRunId },
    );

    const selectedIds = useMemo(
        () => (selectedSourceIds.length > 0 ? selectedSourceIds : undefined),
        [selectedSourceIds],
    );

    const handleFinanceUpload = async () => {
        if (!financeFile) return;
        try {
            const base64 = await readFileAsBase64(financeFile);
            await importSnapshot.mutateAsync({
                base64,
                fileName: financeFile.name,
            });
            setFinanceFile(null);
        } catch (err: any) {
            setToast(err.message || "Finance snapshot import failed.");
        }
    };

    return (
        <div className="space-y-8">
            {toast && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
                    {toast}
                </div>
            )}

            <section className="rounded-xl border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <h2 className="text-lg font-semibold mb-1">Finance Reconciliation (Read-Only)</h2>
                <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
                    Upload finance tracker snapshot and review IPC vs finance deltas.
                </p>

                <div className="flex items-end gap-3 flex-wrap">
                    <input
                        type="file"
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(e) => setFinanceFile(e.target.files?.[0] ?? null)}
                        className="text-sm"
                    />
                    <button
                        onClick={handleFinanceUpload}
                        disabled={!financeFile || importSnapshot.isPending}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
                    >
                        {importSnapshot.isPending ? "Importing…" : "Import Snapshot"}
                    </button>
                </div>

                {deltaReport && (
                    <div className="mt-5 space-y-3">
                        <p className="text-sm font-medium">
                            Snapshot #{deltaReport.summary.snapshotId} · {deltaReport.summary.total} delta item(s)
                        </p>
                        <div className="flex gap-2 flex-wrap text-xs">
                            {Object.entries(deltaReport.summary.byCategory).map(([category, count]) => (
                                <span key={category} className="px-2 py-1 rounded bg-gray-100">
                                    {category}: {count}
                                </span>
                            ))}
                        </div>
                        <div className="overflow-auto rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr style={{ backgroundColor: "var(--color-bg)" }}>
                                        <th className="text-left px-3 py-2">Category</th>
                                        <th className="text-left px-3 py-2">Severity</th>
                                        <th className="text-left px-3 py-2">Project</th>
                                        <th className="text-right px-3 py-2">Delta</th>
                                        <th className="text-left px-3 py-2">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deltaReport.items.map((item: any) => (
                                        <tr key={item.id} className="border-t" style={{ borderColor: "var(--color-border-light)" }}>
                                            <td className="px-3 py-2">{item.category}</td>
                                            <td className="px-3 py-2">{item.severity}</td>
                                            <td className="px-3 py-2">{item.project?.name || item.cfpNumber || item.projectNumber || "—"}</td>
                                            <td className="px-3 py-2 text-right font-mono">{formatMoney(item.deltaAmount ?? 0)}</td>
                                            <td className="px-3 py-2">{item.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-xl border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <h2 className="text-lg font-semibold mb-1">Public Document Ingestion</h2>
                <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
                    Curated sources + manual run + deterministic report.
                </p>

                <div className="grid gap-3 md:grid-cols-4">
                    <input
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                        placeholder="Source name"
                        className="border rounded px-3 py-2 text-sm"
                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                    />
                    <select
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value as "local_file" | "public_url")}
                        className="border rounded px-3 py-2 text-sm"
                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                    >
                        <option value="local_file">local_file</option>
                        <option value="public_url">public_url</option>
                    </select>
                    <input
                        value={sourceLocation}
                        onChange={(e) => setSourceLocation(e.target.value)}
                        placeholder={sourceType === "local_file" ? "Path to file (.xlsx/.pdf)" : "https://..."}
                        className="border rounded px-3 py-2 text-sm md:col-span-2"
                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                    />
                </div>

                <div className="mt-3 flex gap-2">
                    <button
                        onClick={() => upsertSource.mutate({
                            name: sourceName,
                            sourceType,
                            location: sourceLocation,
                            enabled: true,
                        })}
                        disabled={!sourceName || !sourceLocation || upsertSource.isPending}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-50"
                    >
                        Add Source
                    </button>
                    <button
                        onClick={() => runIngest.mutate({ sourceIds: selectedIds })}
                        disabled={runIngest.isPending}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
                    >
                        {runIngest.isPending ? "Running…" : "Run Ingestion"}
                    </button>
                </div>

                <div className="mt-4 overflow-auto rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                    <table className="w-full text-xs">
                        <thead>
                            <tr style={{ backgroundColor: "var(--color-bg)" }}>
                                <th className="px-3 py-2 text-left">Use</th>
                                <th className="px-3 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sources?.map((source: any) => (
                                <tr key={source.id} className="border-t" style={{ borderColor: "var(--color-border-light)" }}>
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedSourceIds.includes(source.id)}
                                            onChange={(e) => {
                                                setSelectedSourceIds((prev) => e.target.checked
                                                    ? [...prev, source.id]
                                                    : prev.filter((id) => id !== source.id));
                                            }}
                                        />
                                    </td>
                                    <td className="px-3 py-2">{source.name}</td>
                                    <td className="px-3 py-2">{source.sourceType}</td>
                                    <td className="px-3 py-2 font-mono">{source.location}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {runReport && (
                    <div className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--color-border)" }}>
                        <p className="font-semibold mb-2">
                            Run #{runReport.metrics.runId}: {runReport.metrics.status}
                        </p>
                        <p>Sources: {runReport.metrics.sourceCount} · Records: {runReport.metrics.recordCount} · Issues: {runReport.metrics.issueCount} · Review Queue: {runReport.reviewQueueCount}</p>
                    </div>
                )}
            </section>
        </div>
    );
}
