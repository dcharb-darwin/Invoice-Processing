import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { formatMoney, formatDate } from "../lib/format.js";
import { sourceLabel, signedLabel, contractLabel } from "../lib/sourceLabels.js";

const STATUSES = ["Received", "Logged", "Reviewed", "Signed", "Paid"] as const;

const statusColors: Record<string, string> = {
    Received: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
    Logged: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Reviewed: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    Signed: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function InvoicePipeline() {
    const utils = trpc.useUtils();
    const { data: invoices, isLoading } = trpc.invoices.listAll.useQuery();
    const updateMutation = trpc.invoices.update.useMutation({
        onSuccess: () => utils.invoices.listAll.invalidate(),
    });

    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState<Record<string, any>>({});
    const [docTab, setDocTab] = useState<"source" | "signed">("source");

    const lanes = STATUSES.map((status) => ({
        status,
        invoices: (invoices ?? []).filter((inv) => (inv.status ?? "Received") === status),
    }));

    const selectedInvoice = selectedInvoiceId
        ? (invoices ?? []).find((inv) => inv.id === selectedInvoiceId)
        : null;

    const hasSourceDoc = selectedInvoice?.sourcePdfPath;
    const hasSignedDoc = selectedInvoice?.signedPdfPath;
    const hasAnyDoc = hasSourceDoc || hasSignedDoc;
    const activeDocUrl = docTab === "signed" && hasSignedDoc
        ? selectedInvoice?.signedPdfPath
        : selectedInvoice?.sourcePdfPath || selectedInvoice?.signedPdfPath;

    function startEdit() {
        if (!selectedInvoice) return;
        setEditData({
            vendor: selectedInvoice.vendor || "",
            totalAmount: selectedInvoice.totalAmount,
            dateReceived: selectedInvoice.dateReceived || "",
            dateApproved: selectedInvoice.dateApproved || "",
            status: selectedInvoice.status || "Received",
            grantEligible: selectedInvoice.grantEligible ?? false,
            grantCode: selectedInvoice.grantCode || "",
        });
        setEditMode(true);
    }

    function cancelEdit() {
        setEditMode(false);
        setEditData({});
    }

    function saveEdit() {
        if (!selectedInvoice) return;
        updateMutation.mutate({
            id: selectedInvoice.id,
            vendor: editData.vendor || undefined,
            totalAmount: editData.totalAmount || undefined,
            dateReceived: editData.dateReceived || undefined,
            dateApproved: editData.dateApproved || undefined,
            status: editData.status || undefined,
            grantEligible: editData.grantEligible,
            grantCode: editData.grantCode || undefined,
        });
        setEditMode(false);
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2">Invoice Pipeline</h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                Kanban view of invoice workflow across all projects
            </p>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {lanes.map(({ status, invoices: laneInvoices }) => (
                    <div
                        key={status}
                        className="min-w-[220px] flex-shrink-0 rounded-xl border"
                        style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                    >
                        {/* Column header */}
                        <div
                            className="px-3 py-2.5 border-b rounded-t-xl flex items-center justify-between"
                            style={{ borderColor: "var(--color-border)" }}
                        >
                            <span className="text-sm font-semibold">{status}</span>
                            <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: "var(--color-badge-bg)", color: "var(--color-text-muted)" }}
                            >
                                {laneInvoices.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="p-2 space-y-2 min-h-[120px]">
                            {laneInvoices.length === 0 && (
                                <div className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>
                                    No invoices
                                </div>
                            )}
                            {laneInvoices.map((inv) => (
                                <div
                                    key={inv.id}
                                    onClick={() => {
                                        setSelectedInvoiceId(selectedInvoiceId === inv.id ? null : inv.id);
                                        setEditMode(false);
                                        setDocTab("source");
                                    }}
                                    className={`rounded-lg shadow-sm p-3 text-sm border-l-[3px] cursor-pointer hover:shadow-md transition-all ${status === "Paid"
                                        ? "border-l-emerald-500"
                                        : "border-l-blue-600"
                                        } ${selectedInvoiceId === inv.id ? "ring-2 ring-blue-500" : ""}`}
                                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                                >
                                    <div className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                        {inv.invoiceNumber}
                                    </div>
                                    <div className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                                        {inv.vendor || "Unknown vendor"}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="font-semibold text-xs">{formatMoney(inv.totalAmount)}</span>
                                        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                                            {formatDate(inv.dateReceived)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail / Split-View Panel */}
            {selectedInvoice && (
                <div
                    className="mt-4 rounded-xl border shadow-sm overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {selectedInvoice.invoiceNumber}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[selectedInvoice.status ?? "Received"]}`}>
                                {selectedInvoice.status}
                            </span>
                            {(selectedInvoice as any).project && (
                                <a
                                    href={`#/project/${selectedInvoice.projectId}/invoices`}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    📁 {(selectedInvoice as any).project.name}
                                </a>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!editMode && (
                                <button
                                    onClick={startEdit}
                                    className="text-xs px-3 py-1 rounded-md font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                    ✏️ Edit
                                </button>
                            )}
                            <button
                                onClick={() => { setSelectedInvoiceId(null); setEditMode(false); }}
                                className="text-sm hover:text-red-500 transition-colors p-1"
                                style={{ color: "var(--color-text-muted)" }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Split-view body */}
                    <div className={`flex ${hasAnyDoc ? "" : ""}`} style={{ minHeight: "420px" }}>

                        {/* Left panel — details / edit */}
                        <div className={`p-5 space-y-4 overflow-y-auto ${hasAnyDoc ? "w-1/2 border-r" : "w-full"}`} style={{ borderColor: "var(--color-border)", maxHeight: "520px" }}>

                            {/* Project & contract context */}
                            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Context</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Project</p>
                                        <a href={`#/project/${selectedInvoice.projectId}`} className="font-medium text-blue-700 dark:text-blue-300 hover:underline text-xs">
                                            {(selectedInvoice as any).project?.name || `Project #${selectedInvoice.projectId}`}
                                        </a>
                                    </div>
                                    {(selectedInvoice as any).project?.cfpNumber && (
                                        <div>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>CFP #</p>
                                            <p className="font-mono text-xs">{(selectedInvoice as any).project.cfpNumber}</p>
                                        </div>
                                    )}
                                    {(selectedInvoice as any).contract && (
                                        <>
                                            <div>
                                                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Contract</p>
                                                <p className="text-xs font-medium">{(selectedInvoice as any).contract.vendor}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Contract #</p>
                                                <p className="text-xs">
                                                    <a href={`#/project/${selectedInvoice.projectId}/contracts`} className="font-mono text-blue-700 dark:text-blue-300 hover:underline">
                                                        {(selectedInvoice as any).contract.contractNumber || "—"}
                                                    </a>
                                                    {" · "}{(selectedInvoice as any).contract.type}
                                                    {(selectedInvoice as any).contract.signedDocumentLink && (
                                                        <>
                                                            {" · "}
                                                            <a href={(selectedInvoice as any).contract.signedDocumentLink} target="_blank" rel="noopener noreferrer" className={`text-xs ${contractLabel((selectedInvoice as any).contract.signedDocumentLink).className}`}>{contractLabel((selectedInvoice as any).contract.signedDocumentLink).text}</a>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    {(selectedInvoice as any).project?.projectManager && (
                                        <div>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Project Manager</p>
                                            <p className="text-xs">{(selectedInvoice as any).project.projectManager}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Invoice fields — view or edit mode */}
                            {editMode ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Vendor</label>
                                            <input type="text" value={editData.vendor} onChange={(e) => setEditData({ ...editData, vendor: e.target.value })}
                                                className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }} />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Amount (cents)</label>
                                            <input type="number" value={editData.totalAmount} onChange={(e) => setEditData({ ...editData, totalAmount: parseInt(e.target.value) || 0 })}
                                                className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }} />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Date Received</label>
                                            <input type="date" value={editData.dateReceived?.split("T")[0] || ""} onChange={(e) => setEditData({ ...editData, dateReceived: e.target.value })}
                                                className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }} />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Date Approved</label>
                                            <input type="date" value={editData.dateApproved?.split("T")[0] || ""} onChange={(e) => setEditData({ ...editData, dateApproved: e.target.value })}
                                                className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }} />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Status</label>
                                            <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                                className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
                                                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Grant Code</label>
                                            <input type="text" value={editData.grantCode} onChange={(e) => setEditData({ ...editData, grantCode: e.target.value })}
                                                className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-md border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }} />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={editData.grantEligible} onChange={(e) => setEditData({ ...editData, grantEligible: e.target.checked })} />
                                        Grant Eligible
                                    </label>
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={saveEdit} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                                            Save
                                        </button>
                                        <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors" style={{ borderColor: "var(--color-border)" }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Vendor</p>
                                            <p className="font-medium text-xs">{selectedInvoice.vendor || "Unknown"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Amount</p>
                                            <p className="font-bold text-xs">{formatMoney(selectedInvoice.totalAmount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Date Received</p>
                                            <p className="font-medium text-xs">{formatDate(selectedInvoice.dateReceived)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Date Approved</p>
                                            <p className="font-medium text-xs">{selectedInvoice.dateApproved ? formatDate(selectedInvoice.dateApproved) : "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Grant</p>
                                            <p className="font-medium text-xs">
                                                {selectedInvoice.grantEligible ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400">{selectedInvoice.grantCode || "Eligible"}</span>
                                                ) : "Not eligible"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Document links */}
                                    {(selectedInvoice.sourcePdfPath || selectedInvoice.signedPdfPath) && (
                                        <div className="text-sm">
                                            <p className="text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>Documents</p>
                                            <p className="flex items-center gap-2">
                                                {selectedInvoice.sourcePdfPath && (
                                                    <a href={selectedInvoice.sourcePdfPath} target="_blank" rel="noopener noreferrer" className={`text-xs ${sourceLabel(selectedInvoice.sourcePdfPath).className}`}>{sourceLabel(selectedInvoice.sourcePdfPath).text}</a>
                                                )}
                                                {selectedInvoice.signedPdfPath && (
                                                    <a href={selectedInvoice.signedPdfPath} target="_blank" rel="noopener noreferrer" className={`text-xs ${signedLabel(selectedInvoice.signedPdfPath).className}`}>{signedLabel(selectedInvoice.signedPdfPath).text}</a>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Task breakdowns */}
                            {selectedInvoice.taskBreakdowns && selectedInvoice.taskBreakdowns.length > 0 && (
                                <div className="rounded-lg shadow-sm p-3 space-y-1.5" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
                                    <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Task Breakdowns</p>
                                    {selectedInvoice.taskBreakdowns.map((tb) => (
                                        <div key={tb.id} className="flex justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                            <span>
                                                {tb.taskCode && <span className="font-mono mr-2" style={{ color: "var(--color-text-muted)" }}>{tb.taskCode}</span>}
                                                {tb.taskDescription}
                                            </span>
                                            <span className="font-medium">{formatMoney(tb.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Go to project link */}
                            <div className="pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                                <a
                                    href={`#/project/${selectedInvoice.projectId}/invoices`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    Go to Project →
                                </a>
                            </div>
                        </div>

                        {/* Right panel — document viewer (only if source doc exists) */}
                        {hasAnyDoc && (
                            <div className="w-1/2 flex flex-col" style={{ minHeight: "420px" }}>
                                {/* Doc tab toggles */}
                                <div className="flex gap-1 px-3 py-2 border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
                                    {hasSourceDoc && (
                                        <button
                                            onClick={() => setDocTab("source")}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${docTab === "source" ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                                        >
                                            📄 Source
                                        </button>
                                    )}
                                    {hasSignedDoc && (
                                        <button
                                            onClick={() => setDocTab("signed")}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${docTab === "signed" ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                                        >
                                            ✅ Signed
                                        </button>
                                    )}
                                </div>
                                {/* iFrame viewer */}
                                {activeDocUrl ? (
                                    <iframe
                                        key={activeDocUrl}
                                        src={activeDocUrl}
                                        className="flex-1 w-full border-0"
                                        title="Invoice Document Viewer"
                                        style={{ minHeight: "380px" }}
                                    />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                                        No document on file
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
