function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, "");
}

export const tasklineAppUrl = normalizeBaseUrl(
    import.meta.env.VITE_TASKLINE_APP_URL || "http://localhost:3002"
);

export function tasklineProjectUrl(projectId: number | string): string {
    return `${tasklineAppUrl}/projects/${projectId}`;
}
