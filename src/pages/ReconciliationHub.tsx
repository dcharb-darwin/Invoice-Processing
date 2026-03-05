export default function ReconciliationHub() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Reconciliation Hub</h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    Vision-only workflow for finance comparison, delta review, and source-driven imports.
                </p>
            </div>

            <section
                className="rounded-xl border shadow-sm p-6"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
                <h3 className="text-base font-semibold mb-2">Not in MVP</h3>
                <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                    This route is intentionally classified as Vision scope. MVP remains focused on core
                    project, invoice, and spreadsheet workflows.
                </p>
            </section>

            <section
                className="rounded-xl border shadow-sm p-6"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
                <h3 className="text-base font-semibold mb-2">Next Step</h3>
                <p className="text-sm leading-6 mb-4" style={{ color: "var(--color-text-secondary)" }}>
                    Configure source locations first in the Vision Admin panel. Reconciliation ingestion will
                    use those mapped SharePoint URLs/folders when we implement the automation pipeline.
                </p>
                <button
                    onClick={() => {
                        window.location.hash = "/admin";
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                    Open Admin Source Config
                </button>
            </section>
        </div>
    );
}
