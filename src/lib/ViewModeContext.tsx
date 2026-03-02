import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

/**
 * MVP/Vision view mode toggle — controls feature visibility.
 * MVP = discovery Priority 1 (core invoice tracking).
 * Vision = full feature set including Priority 2/3 stretch goals.
 * [trace: agents.md §4 — design-pattern-first, general-purpose toggle]
 */

type ViewMode = "mvp" | "vision";

interface ViewModeContextType {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isMvp: boolean;
}

const STORAGE_KEY = "ipc-view-mode";

const ViewModeContext = createContext<ViewModeContextType>({
    viewMode: "mvp",
    setViewMode: () => { },
    isMvp: true,
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewModeState] = useState<ViewMode>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === "mvp" || stored === "vision") return stored;
        } catch { }
        return "mvp";
    });

    const setViewMode = (mode: ViewMode) => {
        setViewModeState(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch { }
    };

    return (
        <ViewModeContext.Provider value={{ viewMode, setViewMode, isMvp: viewMode === "mvp" }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    return useContext(ViewModeContext);
}
