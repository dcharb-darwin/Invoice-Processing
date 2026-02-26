import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc.js";

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

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold">New Project from Template</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Template selector */}
                    {templates && templates.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Template</label>
                            <div className="flex gap-2">
                                {templates.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplateId(t.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedTemplateId === t.id
                                                ? "bg-indigo-600 text-white border-indigo-600"
                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
                                            }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                            {template && (
                                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                            )}
                        </div>
                    )}

                    {/* Project basics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Project Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Main Street Improvements"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CFP Number</label>
                            <input
                                type="text"
                                value={cfpNumber}
                                onChange={(e) => setCfpNumber(e.target.value)}
                                placeholder="e.g. 18013"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Project Number</label>
                            <input
                                type="text"
                                value={projectNumber}
                                onChange={(e) => setProjectNumber(e.target.value)}
                                placeholder="e.g. RD-101"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="ST">ST — Streets</option>
                                <option value="PA">PA — Parks</option>
                                <option value="FA">FA — Facilities</option>
                                <option value="SW">SW — Surface Water</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Project Manager</label>
                            <input
                                type="text"
                                value={pm}
                                onChange={(e) => setPm(e.target.value)}
                                placeholder="e.g. Eric"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Budget categories — selectable */}
                    {template && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Budget Categories ({selectedCats.size} of {template.budgetCategories.length} selected)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {template.budgetCategories.map((cat, i) => (
                                    <button
                                        key={cat.category}
                                        onClick={() => toggleCat(i)}
                                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedCats.has(i)
                                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50"
                                            }`}
                                    >
                                        <span className="mr-2">{selectedCats.has(i) ? "☑" : "☐"}</span>
                                        <span className="font-medium">{cat.category.replace(/_/g, " ")}</span>
                                        <span className="text-xs text-gray-500 block ml-6">{cat.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phases — selectable */}
                    {template && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                875 Standard Phases ({selectedPhases.size} of {template.phases.length} selected)
                            </label>
                            <div className="space-y-2">
                                {template.phases.map((phase, i) => (
                                    <button
                                        key={phase.name}
                                        onClick={() => togglePhase(i)}
                                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedPhases.has(i)
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600"
                                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50"
                                            }`}
                                    >
                                        <span className="mr-2">{selectedPhases.has(i) ? "☑" : "☐"}</span>
                                        <span className="font-medium">{phase.name}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({phase.checklist.length} checklist items)
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        Will create: {selectedCats.size} budget categories, {selectedPhases.size} phases
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim() || createMutation.isPending}
                            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                        >
                            {createMutation.isPending ? "Creating…" : "Create Project"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
