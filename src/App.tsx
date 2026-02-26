import { useState, useEffect } from "react";
import ProjectsList from "./pages/ProjectsList.js";
import ProjectDetail from "./pages/ProjectDetail.js";
import InvoiceSearch from "./pages/InvoiceSearch.js";

/**
 * Root app — hash-based routing, TaskLine-matching design.
 * [trace: dev-plan — same stack as gen2, visual parity]
 */

type Route =
    | { page: "projects" }
    | { page: "project"; id: number }
    | { page: "search" };

function parseHash(): Route {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("/project/")) {
        const id = parseInt(hash.split("/")[2]);
        if (!isNaN(id)) return { page: "project", id };
    }
    if (hash === "/search") return { page: "search" };
    return { page: "projects" };
}

function App() {
    const [route, setRoute] = useState<Route>(parseHash);
    const [health, setHealth] = useState<string>("checking...");
    const [dark, setDark] = useState(false);

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
        else if (r.page === "project") window.location.hash = `/project/${r.id}`;
        else if (r.page === "search") window.location.hash = "/search";
        setRoute(r);
    };

    const navItems = [
        { label: "Projects", icon: "🏗️", key: "projects" },
        { label: "Invoice Search", icon: "🔍", key: "search" },
    ];

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
                                key={item.key}
                                onClick={() => navigate({ page: item.key } as Route)}
                                className={`px-3.5 py-1.5 text-sm rounded-lg font-medium transition-colors ${route.page === item.key
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        : "hover:bg-gray-100 dark:hover:bg-slate-800"
                                    }`}
                                style={{ color: route.page === item.key ? undefined : "var(--color-text-secondary)" }}
                            >
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
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
                {route.page === "projects" && (
                    <ProjectsList onSelectProject={(id) => navigate({ page: "project", id })} />
                )}
                {route.page === "project" && (
                    <ProjectDetail
                        projectId={route.id}
                        onBack={() => navigate({ page: "projects" })}
                    />
                )}
                {route.page === "search" && (
                    <InvoiceSearch onSelectProject={(id) => navigate({ page: "project", id })} />
                )}
            </main>
        </div>
    );
}

export default App;
