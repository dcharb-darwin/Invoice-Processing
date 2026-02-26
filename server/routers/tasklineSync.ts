import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * TaskLine Sync Router — bidirectional project sync between
 * TaskLine gen2 and Invoice Processing Coordinator.
 *
 * Since TaskLine is a separate app not running locally, this router
 * provides a SIMULATED integration that models the real API contract.
 * Swap the stubs for real HTTP calls when TaskLine is available.
 *
 * [trace: 02-taskline-gen2-suggestions.md — integration contract]
 * [trace: 01-development-plan.md L245-249 — TaskLine API integration]
 */

// ---------------------------------------------------------------------------
// Simulated TaskLine projects (would come from TaskLine API in production)
// ---------------------------------------------------------------------------
interface TaskLineProject {
    id: number;
    name: string;
    type: string;
    status: string;
    projectManager: string;
    budget: number; // cents
    actualBudget: number; // cents
    externalId: string | null;
    metadata: Record<string, any> | null;
    createdAt: string;
}

const SIMULATED_TASKLINE_PROJECTS: TaskLineProject[] = [
    {
        id: 101,
        name: "Sunnyside Drainage Improvement",
        type: "Capital",
        status: "Active",
        projectManager: "Eric",
        budget: 1_500_000_00, // $1.5M
        actualBudget: 0,
        externalId: null,
        metadata: null,
        createdAt: "2026-01-15T10:00:00Z",
    },
    {
        id: 102,
        name: "12th Street NE Overlay",
        type: "Capital",
        status: "Planning",
        projectManager: "Shannon",
        budget: 800_000_00, // $800K
        actualBudget: 0,
        externalId: null,
        metadata: null,
        createdAt: "2026-02-01T14:30:00Z",
    },
    {
        id: 103,
        name: "Centennial Trail Extension Phase 3",
        type: "Capital",
        status: "Active",
        projectManager: "Eric",
        budget: 2_200_000_00, // $2.2M
        actualBudget: 450_000_00,
        externalId: null,
        metadata: null,
        createdAt: "2025-11-20T09:00:00Z",
    },
];

// Track which simulated projects have been linked (in-memory for demo)
const linkedTasklineIds = new Set<number>();

export const tasklineSyncRouter = router({
    /**
     * List available TaskLine projects that can be imported.
     * In production: GET /api/trpc/projects.list on TaskLine
     */
    listTasklineProjects: publicProcedure.query(async () => {
        // Check which are already linked in IPC
        const ipcProjects = await db.query.projects.findMany();
        const linkedIds = new Set(
            ipcProjects
                .filter((p) => p.tasklineProjectId != null)
                .map((p) => p.tasklineProjectId!)
        );

        return SIMULATED_TASKLINE_PROJECTS.map((tlp) => ({
            ...tlp,
            alreadyLinked: linkedIds.has(tlp.id),
        }));
    }),

    /**
     * Flow 1: TaskLine → IPC
     * Receive a TaskLine project and create/update the matching IPC project.
     * In production: This is a webhook endpoint or poll-based sync.
     */
    receiveFromTaskline: publicProcedure
        .input(
            z.object({
                tasklineProjectId: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            // Find the simulated TaskLine project
            const tlProject = SIMULATED_TASKLINE_PROJECTS.find(
                (p) => p.id === input.tasklineProjectId
            );
            if (!tlProject) {
                throw new Error(`TaskLine project ${input.tasklineProjectId} not found`);
            }

            // Check if already linked
            const existing = await db.query.projects.findFirst({
                where: eq(schema.projects.tasklineProjectId, tlProject.id),
            });

            if (existing) {
                // Update existing linked project
                const [updated] = await db
                    .update(schema.projects)
                    .set({
                        name: tlProject.name,
                        projectManager: tlProject.projectManager,
                        status: tlProject.status,
                        lastSyncedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(schema.projects.id, existing.id))
                    .returning();
                return { action: "updated" as const, project: updated };
            }

            // Create new IPC project from TaskLine data
            const [created] = await db
                .insert(schema.projects)
                .values({
                    name: tlProject.name,
                    type: "ST", // Default to ST for capital projects
                    status: tlProject.status,
                    projectManager: tlProject.projectManager,
                    tasklineProjectId: tlProject.id,
                    syncDirection: "taskline_to_ipc",
                    lastSyncedAt: new Date().toISOString(),
                })
                .returning();

            linkedTasklineIds.add(tlProject.id);
            return { action: "created" as const, project: created };
        }),

    /**
     * Flow 2: IPC → TaskLine
     * Push an IPC project to TaskLine (simulated).
     * In production: POST /api/trpc/projects.create on TaskLine
     */
    pushToTaskline: publicProcedure
        .input(
            z.object({
                projectId: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
            });
            if (!project) throw new Error(`Project ${input.projectId} not found`);
            if (project.tasklineProjectId) {
                throw new Error(`Project already linked to TaskLine ID ${project.tasklineProjectId}`);
            }

            // Simulate creating in TaskLine — generate a fake TaskLine project ID
            const simulatedTasklineId = 200 + input.projectId;

            // Update IPC project with the link
            const [updated] = await db
                .update(schema.projects)
                .set({
                    tasklineProjectId: simulatedTasklineId,
                    syncDirection: "ipc_to_taskline",
                    lastSyncedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(schema.projects.id, input.projectId))
                .returning();

            return {
                action: "pushed" as const,
                tasklineProjectId: simulatedTasklineId,
                project: updated,
            };
        }),

    /**
     * Get sync status for a specific project.
     */
    status: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(schema.projects.id, input.projectId),
            });
            if (!project) return null;

            return {
                linked: project.tasklineProjectId != null,
                tasklineProjectId: project.tasklineProjectId,
                syncDirection: project.syncDirection,
                lastSyncedAt: project.lastSyncedAt,
            };
        }),
});
