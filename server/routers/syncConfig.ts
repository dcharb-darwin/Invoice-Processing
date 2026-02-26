import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Sync Configuration Router — global auto-sync settings + per-project overrides.
 * [trace: auto-sync PRD — configurable sync modes and intervals]
 */

async function getOrCreateConfig() {
    const existing = await db.query.syncConfig.findFirst();
    if (existing) return existing;

    // Create default config
    const [created] = await db
        .insert(schema.syncConfig)
        .values({ mode: "manual", intervalSeconds: 60, enabled: false })
        .returning();
    return created;
}

export const syncConfigRouter = router({
    /**
     * Get current global sync configuration.
     */
    get: publicProcedure.query(async () => {
        return getOrCreateConfig();
    }),

    /**
     * Update global sync configuration.
     */
    set: publicProcedure
        .input(
            z.object({
                mode: z.enum(schema.SYNC_MODES).optional(),
                intervalSeconds: z.number().min(10).max(900).optional(),
                enabled: z.boolean().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const config = await getOrCreateConfig();

            const updates: any = {};
            if (input.mode !== undefined) updates.mode = input.mode;
            if (input.intervalSeconds !== undefined) updates.intervalSeconds = input.intervalSeconds;
            if (input.enabled !== undefined) updates.enabled = input.enabled;

            const [updated] = await db
                .update(schema.syncConfig)
                .set(updates)
                .where(eq(schema.syncConfig.id, config.id))
                .returning();

            // Notify the sync engine to restart with new settings
            const { restartSyncEngine } = await import("../syncEngine.js");
            restartSyncEngine();

            return updated;
        }),

    /**
     * Set per-project auto-sync override.
     * null = use global setting, true = force enabled, false = force disabled
     */
    setProjectOverride: publicProcedure
        .input(
            z.object({
                projectId: z.number(),
                autoSyncEnabled: z.boolean().nullable(),
            })
        )
        .mutation(async ({ input }) => {
            const [updated] = await db
                .update(schema.projects)
                .set({ autoSyncEnabled: input.autoSyncEnabled })
                .where(eq(schema.projects.id, input.projectId))
                .returning();
            return updated;
        }),

    /**
     * Get per-project auto-sync status (computed from global + override).
     */
    getProjectSyncStatus: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const config = await getOrCreateConfig();
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
            });
            if (!project) return null;

            const globalEnabled = config.enabled && config.mode !== "manual";
            const effectiveEnabled =
                project.autoSyncEnabled !== null
                    ? project.autoSyncEnabled
                    : globalEnabled;

            return {
                globalMode: config.mode,
                globalEnabled: config.enabled,
                projectOverride: project.autoSyncEnabled,
                effectiveEnabled,
                lastSyncedAt: project.lastSyncedAt,
            };
        }),
});
