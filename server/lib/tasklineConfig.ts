import fs from "node:fs";

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, "");
}

function isRunningInDocker(): boolean {
    if (process.env.IN_DOCKER === "true") return true;
    try {
        return fs.existsSync("/.dockerenv");
    } catch {
        return false;
    }
}

const defaultTasklineUrl = isRunningInDocker() ? "http://taskline:3000" : "http://localhost:3002";

export const TASKLINE_URL = normalizeBaseUrl(process.env.TASKLINE_URL || defaultTasklineUrl);
export const TASKLINE_TRPC = `${TASKLINE_URL}/api/trpc`;
export const IPC_URL = normalizeBaseUrl(process.env.IPC_URL || "http://localhost:5173");
