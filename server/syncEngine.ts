import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { eq, isNotNull } from "drizzle-orm";

/**
 * Sync Engine — server-side polling engine for auto-sync.
 * Reads config from DB, runs sync cycles on interval.
 *
 * [trace: auto-sync PRD — polling-based auto-sync]
 */

let timer: ReturnType<typeof setInterval> | null = null;
let currentIntervalMs = 0;

/**
 * Execute one sync cycle based on current config.
 */
export async function runSyncCycle(): Promise<{ synced: number; errors: string[] }> {
    const config = await db.query.syncConfig.findFirst();
    if (!config || !config.enabled || config.mode === "manual") {
        return { synced: 0, errors: [] };
    }

    const errors: string[] = [];
    let synced = 0;

    // Get all linked projects that are auto-sync eligible
    const projects = await db.query.projects.findMany({
        where: isNotNull(schema.projects.tasklineProjectId),
    });

    const eligibleProjects = projects.filter((p) => {
        // Per-project override takes precedence
        if (p.autoSyncEnabled === false) return false;
        if (p.autoSyncEnabled === true) return true;
        return true; // Use global (already checked above)
    });

    for (const project of eligibleProjects) {
        try {
            const shouldSyncFromTaskline =
                config.mode === "auto_taskline_to_ipc" || config.mode === "auto_bidirectional";
            const shouldSyncToTaskline =
                config.mode === "auto_ipc_to_taskline" || config.mode === "auto_bidirectional";

            if (shouldSyncFromTaskline && project.tasklineProjectId) {
                // Simulate pulling latest from TaskLine
                // In production: fetch from TaskLine API and update IPC project
                await db
                    .update(schema.projects)
                    .set({
                        lastSyncedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(schema.projects.id, project.id));
                synced++;
            }

            if (shouldSyncToTaskline && project.tasklineProjectId) {
                // Simulate pushing to TaskLine
                // In production: POST updated data to TaskLine API
                await db
                    .update(schema.projects)
                    .set({
                        lastSyncedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(schema.projects.id, project.id));
                // Only count once if bidirectional
                if (!shouldSyncFromTaskline) synced++;
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
    // Stop existing timer
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
    // Delay initialization to let migrations complete
    setTimeout(() => {
        restartSyncEngine().catch((err) => {
            console.error("[SyncEngine] init error:", err);
        });
    }, 2000);
}
