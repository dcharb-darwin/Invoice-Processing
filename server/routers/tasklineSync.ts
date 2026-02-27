import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * TaskLine Sync Router — real bidirectional project sync between
 * TaskLine gen2 and Invoice Processing Coordinator.
 *
 * Uses HTTP calls to TaskLine's tRPC API at TASKLINE_URL.
 * Falls back gracefully if TaskLine is unreachable.
 *
 * [trace: 02-taskline-gen2-suggestions.md — integration contract]
 * [trace: 01-development-plan.md L245-249 — TaskLine API integration]
 */

const TASKLINE_URL = process.env.TASKLINE_URL || "http://localhost:3000";
const TASKLINE_TRPC = `${TASKLINE_URL}/api/trpc`;
const IPC_URL = process.env.IPC_URL || "http://localhost:5173";

// ---------------------------------------------------------------------------
// TaskLine tRPC HTTP helpers
// ---------------------------------------------------------------------------

async function tasklineQuery<T>(procedure: string, input?: Record<string, unknown>): Promise<T> {
    const url = input
        ? `${TASKLINE_TRPC}/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
        : `${TASKLINE_TRPC}/${procedure}`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`TaskLine ${procedure} failed: ${res.status} ${res.statusText}`);
    const json = await res.json() as any;
    return json.result?.data?.json ?? json.result?.data ?? json;
}

async function tasklineMutate<T>(procedure: string, input: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${TASKLINE_TRPC}/${procedure}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: input }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`TaskLine ${procedure} failed: ${res.status} ${text}`);
    }
    const json = await res.json() as any;
    return json.result?.data?.json ?? json.result?.data ?? json;
}

// ---------------------------------------------------------------------------
// Ensure Capital Project template exists in TaskLine
// ---------------------------------------------------------------------------
let capitalTemplateId: number | null = null;

async function ensureCapitalTemplate(): Promise<number> {
    if (capitalTemplateId) return capitalTemplateId;

    // Check existing templates
    const templates = await tasklineQuery<any[]>("templates.list");
    const existing = templates.find(
        (t: any) => t.name === "Capital Project" || t.templateKey === "capital_project"
    );
    if (existing) {
        capitalTemplateId = existing.id;
        return existing.id;
    }

    // Create Capital Project template in TaskLine
    const created = await tasklineMutate<any>("templates.create", {
        name: "Capital Project",
        templateKey: "capital_project",
        description: "Capital infrastructure project with budget phases for Design, CM, Construction, ROW, and Permitting",
        status: "Published",
        phases: ["Design", "CM Services", "Construction", "ROW", "Permitting"],
        sampleTasks: [
            { taskId: "DES-001", taskDescription: "Design review and approval", phase: "Design", priority: "High" },
            { taskId: "CM-001", taskDescription: "CM contract execution", phase: "CM Services", priority: "High" },
            { taskId: "CON-001", taskDescription: "Construction mobilization", phase: "Construction", priority: "High" },
            { taskId: "ROW-001", taskDescription: "ROW acquisition", phase: "ROW", priority: "Medium" },
            { taskId: "PER-001", taskDescription: "Permit application", phase: "Permitting", priority: "Medium" },
        ],
    });

    capitalTemplateId = created.id;
    console.log(`[TaskLineSync] Created Capital Project template in TaskLine: ID ${created.id}`);
    return created.id;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const tasklineSyncRouter = router({
    /**
     * List available TaskLine projects that can be imported.
     * Calls real TaskLine API: projects.list
     */
    listTasklineProjects: publicProcedure.query(async () => {
        try {
            const tlProjects = await tasklineQuery<any[]>("projects.list");

            // Check which are already linked in IPC
            const ipcProjects = await db.query.projects.findMany();
            const linkedIds = new Set(
                ipcProjects
                    .filter((p) => p.tasklineProjectId != null)
                    .map((p) => p.tasklineProjectId!)
            );

            return tlProjects.map((tlp: any) => ({
                id: tlp.id,
                name: tlp.name,
                type: tlp.templateType || "Unknown",
                status: tlp.status || "Unknown",
                projectManager: tlp.projectManager || "—",
                budget: tlp.budget || 0,
                actualBudget: tlp.actualBudget || 0,
                externalId: tlp.externalId || null,
                metadata: tlp.metadata || null,
                createdAt: tlp.createdAt,
                alreadyLinked: linkedIds.has(tlp.id),
            }));
        } catch (err: any) {
            console.error("[TaskLineSync] Failed to fetch TaskLine projects:", err.message);
            return []; // Return empty if TaskLine is unreachable
        }
    }),

    /**
     * Flow 1: TaskLine → IPC
     * Import a real TaskLine project into IPC.
     */
    receiveFromTaskline: publicProcedure
        .input(
            z.object({
                tasklineProjectId: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            // Get real project from TaskLine
            const tlProject = await tasklineQuery<any>("projects.getById", {
                id: input.tasklineProjectId,
            });

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
                        projectManager: tlProject.projectManager || existing.projectManager,
                        status: tlProject.status || existing.status,
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
                    status: tlProject.status || "Active",
                    projectManager: tlProject.projectManager || null,
                    tasklineProjectId: tlProject.id,
                    syncDirection: "taskline_to_ipc",
                    lastSyncedAt: new Date().toISOString(),
                })
                .returning();

            // Store IPC link back in TaskLine metadata
            try {
                const ipcLink = `${IPC_URL}/#/project/${created.id}`;
                await tasklineMutate("projects.update", {
                    id: tlProject.id,
                    metadata: JSON.stringify({ ipcUrl: ipcLink }),
                });
            } catch (err: any) {
                console.warn("[TaskLineSync] Could not update TaskLine metadata:", err.message);
            }

            return { action: "created" as const, project: created };
        }),

    /**
     * Flow 2: IPC → TaskLine
     * Create a real project in TaskLine from an IPC project.
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

            // Ensure Capital Project template exists in TaskLine
            let templateId: number | undefined;
            try {
                templateId = await ensureCapitalTemplate();
            } catch (err: any) {
                console.warn("[TaskLineSync] Could not ensure Capital template:", err.message);
            }

            // Create real project in TaskLine
            const ipcLink = `${IPC_URL}/#/project/${project.id}`;
            const result = await tasklineMutate<{ id: number }>("projects.create", {
                name: project.name,
                templateType: "Capital Project",
                templateId: templateId,
                projectManager: project.projectManager || undefined,
                budget: undefined, // IPC computes budget from line items, not stored on project
                status: project.status || "Planning",
                metadata: JSON.stringify({ ipcUrl: ipcLink }),
            });

            const tasklineProjectId = result.id;

            // Update IPC project with the real TaskLine link
            const [updated] = await db
                .update(schema.projects)
                .set({
                    tasklineProjectId: tasklineProjectId,
                    syncDirection: "ipc_to_taskline",
                    lastSyncedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(schema.projects.id, input.projectId))
                .returning();

            console.log(`[TaskLineSync] Pushed project "${project.name}" → TaskLine ID ${tasklineProjectId}`);

            return {
                action: "pushed" as const,
                tasklineProjectId,
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
