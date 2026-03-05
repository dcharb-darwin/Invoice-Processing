import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc.js";
import ModalShell from "../components/ModalShell.js";

/**
 * New Project from Template modal.
 * Lets user select template, enter basics, toggle budget categories / phases.
 *
 * [trace: 00-discovery-extraction.md L188 — lack of standardized project initiation]
 * [trace: 875 Standard — phases become template]
 */
export default function NewProjectModal({
    open,
    onClose,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: (projectId: number) => void;
}) {
    const { data: templates } = trpc.templates.list.useQuery(undefined, { enabled: open });
    const [selectedTemplateId, setSelectedTemplateId] = useState("capital_project");
    const { data: template } = trpc.templates.getTemplate.useQuery(
        { templateId: selectedTemplateId },
        { enabled: open && !!selectedTemplateId }
    );

    // Form state
    const [name, setName] = useState("");
    const [cfpNumber, setCfpNumber] = useState("");
    const [projectNumber, setProjectNumber] = useState("");
    const [type, setType] = useState("ST");
    const [pm, setPm] = useState("");
    const [description, setDescription] = useState("");

    // Selection state (all on by default)
    const [selectedCats, setSelectedCats] = useState<Set<number>>(new Set());
    const [selectedPhases, setSelectedPhases] = useState<Set<number>>(new Set());

    // When template loads, select all categories and phases
    useEffect(() => {
        if (template) {
            setSelectedCats(new Set(template.budgetCategories.map((_, i) => i)));
            setSelectedPhases(new Set(template.phases.map((_, i) => i)));
        }
    }, [template]);

    const createMutation = trpc.templates.createProjectFromTemplate.useMutation({
        onSuccess: (data) => {
            onCreated(data.project.id);
            onClose();
            // Reset form
            setName("");
            setCfpNumber("");
            setProjectNumber("");
            setDescription("");
        },
    });

    const toggleCat = (i: number) => {
        const next = new Set(selectedCats);
        next.has(i) ? next.delete(i) : next.add(i);
        setSelectedCats(next);
    };

    const togglePhase = (i: number) => {
        const next = new Set(selectedPhases);
        next.has(i) ? next.delete(i) : next.add(i);
        setSelectedPhases(next);
    };

    const handleCreate = () => {
        createMutation.mutate({
            templateId: selectedTemplateId,
            name,
            cfpNumber: cfpNumber || undefined,
            projectNumber: projectNumber || undefined,
            type,
            projectManager: pm || undefined,
            description: description || undefined,
            selectedCategories: [...selectedCats],
            selectedPhases: [...selectedPhases],
        });
    };

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
            panelClassName="rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        >
                {/* Header */}
                <div className="sticky top-0 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10 border-b" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                    <h2 className="text-lg font-bold">New Project from Template</h2>
                    <button onClick={onClose} className="text-xl hover:text-red-500" style={{ color: "var(--color-text-muted)" }}>✕</button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Template selector */}
                    {templates && templates.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>Template</label>
                            <div className="flex gap-2">
                                {templates.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplateId(t.id)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                                        style={selectedTemplateId === t.id
                                            ? { backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)", color: "#fff" }
                                            : { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                            {template && (
                                <p className="text-xs mt-1" style={helperStyle}>{template.description}</p>
                            )}
                        </div>
                    )}

                    {/* Project basics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>Project Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Main Street Improvements"
                                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>CFP Number</label>
                            <input
                                type="text"
                                value={cfpNumber}
                                onChange={(e) => setCfpNumber(e.target.value)}
                                placeholder="e.g. 18013"
                                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>Project Number</label>
                            <input
                                type="text"
                                value={projectNumber}
                                onChange={(e) => setProjectNumber(e.target.value)}
                                placeholder="e.g. RD-101"
                                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            >
                                <option value="ST">ST — Streets</option>
                                <option value="PA">PA — Parks</option>
                                <option value="FA">FA — Facilities</option>
                                <option value="SW">SW — Surface Water</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={labelStyle}>Project Manager</label>
                            <input
                                type="text"
                                value={pm}
                                onChange={(e) => setPm(e.target.value)}
                                placeholder="e.g. Eric"
                                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Budget categories — selectable */}
                    {template && (
                        <div>
                            <label className="block text-sm font-medium mb-2" style={labelStyle}>
                                Budget Categories ({selectedCats.size} of {template.budgetCategories.length} selected)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {template.budgetCategories.map((cat, i) => (
                                    <button
                                        key={cat.category}
                                        onClick={() => toggleCat(i)}
                                        className="text-left px-3 py-2 rounded-lg border text-sm transition-all"
                                        style={selectedCats.has(i)
                                            ? { backgroundColor: "var(--color-badge-bg)", borderColor: "var(--color-primary)" }
                                            : { backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", opacity: 0.65 }}
                                    >
                                        <span className="mr-2">{selectedCats.has(i) ? "☑" : "☐"}</span>
                                        <span className="font-medium">{cat.category.replace(/_/g, " ")}</span>
                                        <span className="text-xs block ml-6" style={helperStyle}>{cat.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phases — selectable */}
                    {template && (
                        <div>
                            <label className="block text-sm font-medium mb-2" style={labelStyle}>
                                875 Standard Phases ({selectedPhases.size} of {template.phases.length} selected)
                            </label>
                            <div className="space-y-2">
                                {template.phases.map((phase, i) => (
                                    <button
                                        key={phase.name}
                                        onClick={() => togglePhase(i)}
                                        className="w-full text-left px-3 py-2 rounded-lg border text-sm transition-all"
                                        style={selectedPhases.has(i)
                                            ? { backgroundColor: "var(--color-badge-bg)", borderColor: "var(--color-primary)" }
                                            : { backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", opacity: 0.65 }}
                                    >
                                        <span className="mr-2">{selectedPhases.has(i) ? "☑" : "☐"}</span>
                                        <span className="font-medium">{phase.name}</span>
                                        <span className="text-xs ml-2" style={helperStyle}>
                                            ({phase.checklist.length} checklist items)
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 px-6 py-4 rounded-b-2xl flex items-center justify-between border-t" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Will create: {selectedCats.size} budget categories, {selectedPhases.size} phases
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-surface)" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim() || createMutation.isPending}
                            className="px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: "var(--color-primary)" }}
                        >
                            {createMutation.isPending ? "Creating…" : "Create Project"}
                        </button>
                    </div>
                </div>
        </ModalShell>
    );
}
