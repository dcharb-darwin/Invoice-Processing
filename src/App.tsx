import { useState, useEffect } from "react";
import { ViewModeProvider, useViewMode } from "./lib/ViewModeContext.js";
import PortfolioDashboard from "./pages/PortfolioDashboard.js";
import ProjectsList from "./pages/ProjectsList.js";
import ProjectDetail from "./pages/ProjectDetail.js";
import InvoiceSearch from "./pages/InvoiceSearch.js";
import ImportPage from "./pages/ImportPage.js";
import InvoicePipeline from "./pages/InvoicePipeline.js";
import GrantPackage from "./pages/GrantPackage.js";
import ReconciliationHub from "./pages/ReconciliationHub.js";
import AdminPanel from "./pages/AdminPanel.js";
import { topNavButtonClass } from "./lib/navigationStyles.js";

/**
 * Root app — hash-based routing, TaskLine-matching design.
 * [trace: dev-plan — same stack as gen2, visual parity]
 */

type Route =
    | { page: "portfolio" }
    | { page: "projects" }
    | { page: "project"; id: number; tab?: string }
    | { page: "search" }
    | { page: "import" }
    | { page: "pipeline" }
    | { page: "grants" }
    | { page: "reconciliation" }
    | { page: "admin" };

function parseHash(): Route {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("/project/")) {
        const parts = hash.split("/");
        const id = parseInt(parts[2]);
        const tab = parts[3]; // e.g. "invoices", "contracts", "funding", "row"
        if (!isNaN(id)) return { page: "project", id, tab };
    }
    if (hash === "/portfolio") return { page: "portfolio" };
    if (hash === "/search") return { page: "search" };
    if (hash === "/import") return { page: "import" };
    if (hash === "/pipeline") return { page: "pipeline" };
    if (hash === "/grants") return { page: "grants" };
    if (hash === "/reconciliation") return { page: "reconciliation" };
    if (hash === "/admin") return { page: "admin" };
    return { page: "projects" };
}

function AppInner() {
    const [route, setRoute] = useState<Route>(parseHash);
    const [health, setHealth] = useState<string>("checking...");
    const [dark, setDark] = useState(false);
    const { viewMode, setViewMode, isMvp } = useViewMode();

    // Vision-only pages — redirect to projects in MVP mode
    const VISION_PAGES = new Set(["portfolio", "pipeline", "grants", "reconciliation", "admin"]);

    useEffect(() => {
        if (isMvp && VISION_PAGES.has(route.page)) {
            navigate({ page: "projects" });
        }
    }, [isMvp, route.page]);

    useEffect(() => {
        fetch("/api/health")
            .then((r) => r.json())
            .then((d) => setHealth(`Server OK`))
            .catch(() => setHealth("Server offline"));
    }, []);

    useEffect(() => {
        const onHashChange = () => setRoute(parseHash());
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
    }, [dark]);

    const navigate = (r: Route) => {
        if (r.page === "projects") window.location.hash = "/";
        else if (r.page === "portfolio") window.location.hash = "/portfolio";
        else if (r.page === "project") window.location.hash = `/project/${r.id}${r.tab ? `/${r.tab}` : ""}`;
        else if (r.page === "search") window.location.hash = "/search";
        else if (r.page === "import") window.location.hash = "/import";
        else if (r.page === "pipeline") window.location.hash = "/pipeline";
        else if (r.page === "grants") window.location.hash = "/grants";
        else if (r.page === "reconciliation") window.location.hash = "/reconciliation";
        else if (r.page === "admin") window.location.hash = "/admin";
        setRoute(r);
    };

    const allNavItems = [
        { label: "Portfolio", icon: "📊", route: { page: "portfolio" } as Route, visionOnly: true },
        { label: "Projects", icon: "🏗️", route: { page: "projects" } as Route, visionOnly: false },
        { label: "Import", icon: "📥", route: { page: "import" } as Route, visionOnly: false },
        { label: "Invoice Search", icon: "🔍", route: { page: "search" } as Route, visionOnly: false },
        { label: "Pipeline", icon: "📋", route: { page: "pipeline" } as Route, visionOnly: true },
        { label: "Grants", icon: "💰", route: { page: "grants" } as Route, visionOnly: true },
        { label: "Reconciliation", icon: "🧾", route: { page: "reconciliation" } as Route, visionOnly: true },
        { label: "Admin", icon: "⚙️", route: { page: "admin" } as Route, visionOnly: true },
    ];
    const navItems = allNavItems.filter(item => !isMvp || !item.visionOnly);

    return (
        <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
            {/* Header — matches TaskLine's white top bar */}
            <header
                className="sticky top-0 z-50 border-b shadow-sm"
                style={{ backgroundColor: "var(--color-header-bg)", borderColor: "var(--color-border)" }}
            >
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                            IP
                        </div>
                        <div>
                            <h1
                                className="text-base font-semibold tracking-tight cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => navigate({ page: "projects" })}
                            >
                                Invoice Processing Coordinator
                            </h1>
                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                Lake Stevens Public Works
                            </p>
                        </div>
                    </div>

                    {/* Nav — centered pills like TaskLine */}
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => (
                            <button
                                key={item.route.page}
                                onClick={() => navigate(item.route)}
                                className={topNavButtonClass(route.page === item.route.page)}
                                aria-current={route.page === item.route.page ? "page" : undefined}
                            >
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        {/* MVP / Vision toggle */}
                        <div className="flex items-center rounded-lg border overflow-hidden text-xs font-medium" style={{ borderColor: "var(--color-border)" }}>
                            <button
                                onClick={() => setViewMode("mvp")}
                                className={`px-3 py-1.5 transition-colors ${isMvp
                                        ? "bg-blue-600 text-white"
                                        : "hover:bg-gray-100 dark:hover:bg-slate-800"
                                    }`}
                                style={!isMvp ? { color: "var(--color-text-secondary)" } : undefined}
                            >
                                MVP
                            </button>
                            <button
                                onClick={() => setViewMode("vision")}
                                className={`px-3 py-1.5 transition-colors ${!isMvp
                                        ? "bg-indigo-600 text-white"
                                        : "hover:bg-gray-100 dark:hover:bg-slate-800"
                                    }`}
                                style={isMvp ? { color: "var(--color-text-secondary)" } : undefined}
                            >
                                Vision
                            </button>
                        </div>

                        {/* Dark mode toggle */}
                        <button
                            onClick={() => setDark(!dark)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm"
                            title={dark ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {dark ? "☀️" : "🌙"}
                        </button>

                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                            <span
                                className={`w-2 h-2 rounded-full ${health.includes("OK") ? "bg-emerald-500" : "bg-amber-500"
                                    }`}
                            />
                            <span className="hidden md:inline">{health}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {route.page === "portfolio" && (
                    <PortfolioDashboard onSelectProject={(id) => navigate({ page: "project", id })} />
                )}
                {route.page === "projects" && (
                    <ProjectsList onSelectProject={(id) => navigate({ page: "project", id })} />
                )}
                {route.page === "project" && (
                    <ProjectDetail
                        key={`${route.id}-${route.tab || "budget"}`}
                        projectId={route.id}
                        initialTab={route.tab}
                        onBack={() => navigate({ page: "projects" })}
                    />
                )}
                {route.page === "search" && (
                    <InvoiceSearch onSelectProject={(id) => navigate({ page: "project", id })} />
                )}
                {route.page === "import" && (
                    <ImportPage />
                )}
                {route.page === "pipeline" && (
                    <InvoicePipeline />
                )}
                {route.page === "grants" && (
                    <GrantPackage />
                )}
                {route.page === "reconciliation" && (
                    <ReconciliationHub />
                )}
                {route.page === "admin" && (
                    <AdminPanel />
                )}
            </main>
        </div>
    );
}

function App() {
    return (
        <ViewModeProvider>
            <AppInner />
        </ViewModeProvider>
    );
}

export default App;
