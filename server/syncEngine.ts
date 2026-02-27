import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { eq, isNotNull } from "drizzle-orm";

/**
 * Sync Engine — server-side polling engine for auto-sync.
 * Uses real TaskLine tRPC API calls for bidirectional data exchange.
 *
 * [trace: auto-sync PRD — polling-based auto-sync]
 */

const TASKLINE_URL = process.env.TASKLINE_URL || "http://localhost:3000";
const TASKLINE_TRPC = `${TASKLINE_URL}/api/trpc`;
const IPC_URL = process.env.IPC_URL || "http://localhost:5173";

let timer: ReturnType<typeof setInterval> | null = null;
let currentIntervalMs = 0;

// ---------------------------------------------------------------------------
// TaskLine HTTP helpers (mirrors tasklineSync.ts)
// ---------------------------------------------------------------------------

async function tlQuery<T>(procedure: string, input?: Record<string, unknown>): Promise<T> {
    const url = input
        ? `${TASKLINE_TRPC}/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
        : `${TASKLINE_TRPC}/${procedure}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TL ${procedure}: ${res.status}`);
    const json = await res.json() as any;
    return json.result?.data?.json ?? json.result?.data ?? json;
}

async function tlMutate<T>(procedure: string, input: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${TASKLINE_TRPC}/${procedure}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: input }),
    });
    if (!res.ok) throw new Error(`TL ${procedure}: ${res.status}`);
    const json = await res.json() as any;
    return json.result?.data?.json ?? json.result?.data ?? json;
}

// ---------------------------------------------------------------------------
// Budget computation
// ---------------------------------------------------------------------------

/**
 * Compute aggregated budget totals for an IPC project.
 * totalProjected = SUM(budgetLineItems.projectedCost)
 * totalSpent = SUM(invoiceTaskBreakdown.amount) grouped by budget line item
 */
export async function computeProjectBudget(projectId: number): Promise<{ totalProjected: number; totalSpent: number }> {
    const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, projectId),
        with: {
            budgetLineItems: true,
            invoices: { with: { taskBreakdowns: true } },
        },
    });
    if (!project) return { totalProjected: 0, totalSpent: 0 };

    const totalProjected = project.budgetLineItems.reduce((s: number, b) => s + b.projectedCost, 0);
    const totalSpent = project.invoices
        .flatMap((inv) => inv.taskBreakdowns)
        .reduce((s: number, tb) => s + tb.amount, 0);

    return { totalProjected, totalSpent };
}

// ---------------------------------------------------------------------------
// Sync cycle
// ---------------------------------------------------------------------------

/**
 * Execute one sync cycle based on current config.
 * Performs real API calls to/from TaskLine.
 */
export async function runSyncCycle(): Promise<{ synced: number; errors: string[] }> {
    const config = await db.query.syncConfig.findFirst();
    if (!config || !config.enabled || config.mode === "manual") {
        return { synced: 0, errors: [] };
    }

    const errors: string[] = [];
    let synced = 0;

    const projects = await db.query.projects.findMany({
        where: isNotNull(schema.projects.tasklineProjectId),
    });

    const eligibleProjects = projects.filter((p) => {
        if (p.autoSyncEnabled === false) return false;
        if (p.autoSyncEnabled === true) return true;
        return true; // Use global (already checked above)
    });

    const shouldSyncFromTaskline =
        config.mode === "auto_taskline_to_ipc" || config.mode === "auto_bidirectional";
    const shouldSyncToTaskline =
        config.mode === "auto_ipc_to_taskline" || config.mode === "auto_bidirectional";

    for (const project of eligibleProjects) {
        try {
            // --- TaskLine → IPC: pull latest from TaskLine ---
            if (shouldSyncFromTaskline && project.tasklineProjectId) {
                try {
                    const tlProject = await tlQuery<any>("projects.getById", {
                        id: project.tasklineProjectId,
                    });

                    if (!tlProject || !tlProject.id) {
                        // Stale ID — TaskLine project doesn't exist. Clear the link.
                        console.warn(
                            `[SyncEngine] TaskLine project ${project.tasklineProjectId} not found — clearing stale link for IPC project ${project.id}`
                        );
                        await db
                            .update(schema.projects)
                            .set({
                                tasklineProjectId: null,
                                syncDirection: null,
                                lastSyncedAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            })
                            .where(eq(schema.projects.id, project.id));
                        continue; // Skip further sync for this project
                    }

                    // Update IPC project with latest TaskLine data
                    await db
                        .update(schema.projects)
                        .set({
                            name: tlProject.name || project.name,
                            projectManager: tlProject.projectManager || project.projectManager,
                            status: tlProject.status || project.status,
                            lastSyncedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        })
                        .where(eq(schema.projects.id, project.id));
                    synced++;
                } catch (err: any) {
                    if (err.message?.includes("404")) {
                        // Stale ID — clear it
                        console.warn(
                            `[SyncEngine] TaskLine ${project.tasklineProjectId} returned 404 — clearing for IPC project ${project.id}`
                        );
                        await db
                            .update(schema.projects)
                            .set({
                                tasklineProjectId: null,
                                syncDirection: null,
                                lastSyncedAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            })
                            .where(eq(schema.projects.id, project.id));
                        continue;
                    }
                    throw err; // Re-throw non-404 errors
                }
            }

            // --- IPC → TaskLine: push IPC data to TaskLine ---
            if (shouldSyncToTaskline && project.tasklineProjectId) {
                try {
                    // Compute real budget totals from IPC line items
                    const budget = await computeProjectBudget(project.id);
                    await tlMutate("projects.update", {
                        id: project.tasklineProjectId,
                        name: project.name,
                        projectManager: project.projectManager || undefined,
                        status: project.status || undefined,
                        budget: budget.totalProjected,
                        actualBudget: budget.totalSpent,
                        metadata: JSON.stringify({
                            ipcUrl: `${IPC_URL}/#/project/${project.id}`,
                        }),
                    });
                    if (!shouldSyncFromTaskline) synced++;
                } catch (err: any) {
                    // Non-fatal — log but don't fail the cycle
                    errors.push(`Push project ${project.id}: ${err.message}`);
                }
            }
        } catch (err: any) {
            errors.push(`Project ${project.id}: ${err.message}`);
        }
    }

    // Store result
    await db
        .update(schema.syncConfig)
        .set({
            lastAutoSyncAt: new Date().toISOString(),
            lastAutoSyncResult: JSON.stringify({ synced, errors }),
        })
        .where(eq(schema.syncConfig.id, config.id));

    if (synced > 0 || errors.length > 0) {
        console.log(`[SyncEngine] cycle complete: ${synced} synced, ${errors.length} errors`);
    }

    return { synced, errors };
}

/**
 * Start or restart the sync engine based on current DB config.
 */
export async function restartSyncEngine() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        console.log("[SyncEngine] stopped");
    }

    const config = await db.query.syncConfig.findFirst();
    if (!config || !config.enabled || config.mode === "manual") {
        console.log("[SyncEngine] auto-sync disabled");
        return;
    }

    currentIntervalMs = config.intervalSeconds * 1000;
    console.log(`[SyncEngine] starting: mode=${config.mode}, interval=${config.intervalSeconds}s`);

    // Run immediately on start, then on interval
    try {
        await runSyncCycle();
    } catch (err) {
        console.error("[SyncEngine] initial cycle error:", err);
    }

    timer = setInterval(async () => {
        try {
            await runSyncCycle();
        } catch (err) {
            console.error("[SyncEngine] cycle error:", err);
        }
    }, currentIntervalMs);
}

/**
 * Initialize the sync engine on server startup.
 */
export function initSyncEngine() {
    setTimeout(() => {
        restartSyncEngine().catch((err) => {
            console.error("[SyncEngine] init error:", err);
        });
    }, 2000);
}
