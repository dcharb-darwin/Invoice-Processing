import { useEffect, useMemo, useState } from "react";

type SourceTarget = {
    id: string;
    label: string;
    kind: "site" | "library" | "folder" | "file";
    url: string;
    notes: string;
};

const STORAGE_KEY = "ipc-sharepoint-source-map-v1";

const DEFAULT_TARGETS: SourceTarget[] = [
    {
        id: "capital_projects_site",
        label: "Capital Projects Site",
        kind: "site",
        url: "",
        notes: "Top-level SharePoint site or hub URL.",
    },
    {
        id: "finance_invoices_folder",
        label: "Finance Invoices Folder",
        kind: "folder",
        url: "",
        notes: "Incoming invoice files used for future intake.",
    },
    {
        id: "adopted_budget_files",
        label: "Adopted Budget Source",
        kind: "file",
        url: "",
        notes: "Budget source workbook/PDF link used for funding references.",
    },
    {
        id: "grant_documents_library",
        label: "Grant Documents Library",
        kind: "library",
        url: "",
        notes: "Library/folder for grant agreements and amendments.",
    },
];

function isValidHttpUrl(value: string): boolean {
    if (!value.trim()) return true;
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

export default function AdminPanel() {
    const [targets, setTargets] = useState<SourceTarget[]>(DEFAULT_TARGETS);
    const [saveState, setSaveState] = useState<string>("Not saved");

    useEffect(() => {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw) as SourceTarget[];
            if (!Array.isArray(parsed)) return;
            const merged = DEFAULT_TARGETS.map((base) => {
                const existing = parsed.find((item) => item.id === base.id);
                if (!existing) return base;
                return {
                    ...base,
                    url: typeof existing.url === "string" ? existing.url : "",
                    notes: typeof existing.notes === "string" ? existing.notes : base.notes,
                    kind: existing.kind ?? base.kind,
                };
            });
            setTargets(merged);
            setSaveState("Loaded saved config");
        } catch {
            setSaveState("Saved config unreadable");
        }
    }, []);

    const hasInvalidUrl = useMemo(
        () => targets.some((target) => !isValidHttpUrl(target.url)),
        [targets]
    );

    const updateTarget = (id: string, patch: Partial<SourceTarget>) => {
        setTargets((previous) =>
            previous.map((target) => (target.id === id ? { ...target, ...patch } : target))
        );
    };

    const saveConfig = () => {
        if (hasInvalidUrl) {
            setSaveState("Fix invalid URLs before saving");
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
        setSaveState(`Saved ${new Date().toLocaleString("en-US")}`);
    };

    const resetConfig = () => {
        setTargets(DEFAULT_TARGETS);
        setSaveState("Reset to defaults");
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Admin Panel</h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    Vision-only source mapping stub for SharePoint locations and intake folders.
                </p>
            </div>

            <section
                className="rounded-xl border shadow-sm p-6"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
                <h3 className="text-base font-semibold mb-2">Scope</h3>
                <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                    This stub captures source URLs and folder pointers only. No file polling, API sync,
                    or automatic ingestion runs in MVP.
                </p>
            </section>

            <section
                className="rounded-xl border shadow-sm p-6"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">SharePoint Source Mapping</h3>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {saveState}
                    </span>
                </div>

                <div className="space-y-4">
                    {targets.map((target) => {
                        const invalid = !isValidHttpUrl(target.url);
                        return (
                            <div
                                key={target.id}
                                className="rounded-xl border p-4"
                                style={{ borderColor: invalid ? "#ef4444" : "var(--color-border)" }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium">{target.label}</label>
                                    <span
                                        className="text-[11px] px-2 py-0.5 rounded border"
                                        style={{
                                            borderColor: "var(--color-border)",
                                            color: "var(--color-text-muted)",
                                        }}
                                    >
                                        {target.kind}
                                    </span>
                                </div>
                                <input
                                    type="url"
                                    value={target.url}
                                    onChange={(event) => updateTarget(target.id, { url: event.target.value })}
                                    placeholder="https://..."
                                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}
                                />
                                {invalid && (
                                    <p className="text-xs mt-2 text-red-600">
                                        Enter a valid http/https URL.
                                    </p>
                                )}
                                <textarea
                                    value={target.notes}
                                    onChange={(event) => updateTarget(target.id, { notes: event.target.value })}
                                    rows={2}
                                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm resize-y"
                                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        onClick={saveConfig}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                        Save Source Map
                    </button>
                    <button
                        onClick={resetConfig}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                        style={{ borderColor: "var(--color-border)" }}
                    >
                        Reset
                    </button>
                </div>
            </section>
        </div>
    );
}
