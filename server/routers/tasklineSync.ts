import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { computeProjectBudget, syncPhaseBudgets } from "../syncEngine.js";
import { IPC_URL, TASKLINE_TRPC, TASKLINE_URL } from "../lib/tasklineConfig.js";

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

type ProcedureKind = "query" | "mutation";
type ProbeFailure = "unreachable" | "missing_procedure" | "unexpected";
type ErrorClass = "unreachable" | "wrong_backend" | "contract_mismatch" | "unknown";

type ProcedureCheck = {
    procedure: string;
    kind: ProcedureKind;
    input?: Record<string, unknown>;
};

const REQUIRED_PROCEDURE_CHECKS: ProcedureCheck[] = [
    { procedure: "projects.list", kind: "query" },
    { procedure: "projects.getById", kind: "query", input: { id: -1 } },
    { procedure: "projects.create", kind: "mutation", input: {} },
    { procedure: "projects.update", kind: "mutation", input: {} },
    { procedure: "templates.list", kind: "query" },
    { procedure: "templates.create", kind: "mutation", input: {} },
    { procedure: "tasks.listByProject", kind: "query", input: { projectId: -1 } },
    { procedure: "tasks.update", kind: "mutation", input: {} },
];

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

function parseErrorMessage(responseBody: string): string {
    try {
        const parsed = JSON.parse(responseBody);
        return (
            parsed?.error?.json?.message ||
            parsed?.error?.message ||
            responseBody.slice(0, 200)
        );
    } catch {
        return responseBody.slice(0, 200);
    }
}

async function probeTasklineProcedure(check: ProcedureCheck): Promise<{
    procedure: string;
    ok: boolean;
    message?: string;
    failure?: ProbeFailure;
}> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
        let response: Response;

        if (check.kind === "query") {
            const url = check.input
                ? `${TASKLINE_TRPC}/${check.procedure}?input=${encodeURIComponent(JSON.stringify({ json: check.input }))}`
                : `${TASKLINE_TRPC}/${check.procedure}`;
            response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
            });
        } else {
            response = await fetch(`${TASKLINE_TRPC}/${check.procedure}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ json: check.input ?? {} }),
                signal: controller.signal,
            });
        }

        const bodyText = await response.text();
        const message = parseErrorMessage(bodyText);

        if (response.ok) {
            return {
                procedure: check.procedure,
                ok: true,
            };
        }

        if (/No procedure found on path/i.test(message)) {
            return {
                procedure: check.procedure,
                ok: false,
                failure: "missing_procedure",
                message,
            };
        }

        if (
            response.status === 400 ||
            response.status === 422 ||
            /validation|invalid|bad request|parse/i.test(message)
        ) {
            return {
                procedure: check.procedure,
                ok: true,
                message: "Procedure reachable (validation failed as expected).",
            };
        }

        return {
            procedure: check.procedure,
            ok: false,
            failure: "unexpected",
            message: `HTTP ${response.status}: ${message}`,
        };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.name === "AbortError"
                    ? "Request timed out"
                    : error.message
                : "Unknown network error";
        return {
            procedure: check.procedure,
            ok: false,
            failure: "unreachable",
            message,
        };
    } finally {
        clearTimeout(timeout);
    }
}

function classifyConnectionError(
    checks: Array<{ procedure: string; ok: boolean; failure?: ProbeFailure }>
): ErrorClass {
    const failed = checks.filter((c) => !c.ok);
    if (failed.length === 0) return "unknown";
    if (failed.some((c) => c.failure === "unreachable")) return "unreachable";

    const failedNames = new Set(failed.map((f) => f.procedure));
    const coreFailures =
        failedNames.has("projects.list") &&
        failedNames.has("templates.list") &&
        failedNames.has("projects.getById");

    if (coreFailures || failed.length >= Math.ceil(checks.length * 0.75)) {
        return "wrong_backend";
    }

    if (failed.some((c) => c.failure === "missing_procedure")) {
        return "contract_mismatch";
    }

    return "unknown";
}

function getConnectionMessage(errorClass: ErrorClass, failedProcedures: string[]): string {
    if (errorClass === "unreachable") {
        return `TaskLine is unreachable at ${TASKLINE_URL}. Ensure TaskLine is running and TASKLINE_URL is configured correctly.`;
    }
    if (errorClass === "wrong_backend") {
        return `Endpoint ${TASKLINE_URL} is reachable but does not appear to be the TaskLine API. Verify port mapping and service target.`;
    }
    if (errorClass === "contract_mismatch") {
        return `TaskLine is reachable, but required procedures are missing or incompatible: ${failedProcedures.join(", ")}.`;
    }
    return `TaskLine connectivity check failed unexpectedly for: ${failedProcedures.join(", ")}.`;
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
     * Connectivity diagnostics for TaskLine integration.
     * Used by UI guardrails to avoid silent fallbacks.
     */
    connectionStatus: publicProcedure.query(async () => {
        const checks = await Promise.all(
            REQUIRED_PROCEDURE_CHECKS.map(async (check) => probeTasklineProcedure(check))
        );

        const failedProcedures = checks.filter((c) => !c.ok).map((c) => c.procedure);
        const ok = failedProcedures.length === 0;

        if (ok) {
            return {
                ok: true,
                tasklineUrl: TASKLINE_URL,
                appUrl: IPC_URL,
                checks: checks.map((c) => ({
                    procedure: c.procedure,
                    ok: c.ok,
                    message: c.message,
                })),
                errorClass: null,
                userMessage: "TaskLine connection looks healthy.",
            };
        }

        const errorClass = classifyConnectionError(checks);
        return {
            ok: false,
            tasklineUrl: TASKLINE_URL,
            appUrl: IPC_URL,
            checks: checks.map((c) => ({
                procedure: c.procedure,
                ok: c.ok,
                message: c.message,
            })),
            errorClass,
            userMessage: getConnectionMessage(errorClass, failedProcedures),
        };
    }),

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
            console.error("[TaskLineSync] Run sync.connectionStatus for diagnostics.");
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

            // Compute real budget totals from IPC line items
            const budgetTotals = await computeProjectBudget(project.id);

            // Create real project in TaskLine
            const ipcLink = `${IPC_URL}/#/project/${project.id}`;
            const result = await tasklineMutate<{ id: number }>("projects.create", {
                name: project.name,
                templateType: "Capital Project",
                templateId: templateId,
                projectManager: project.projectManager || undefined,
                budget: budgetTotals.totalProjected,
                actualBudget: budgetTotals.totalSpent,
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

            // Sync per-phase budget data to TaskLine tasks
            try {
                const phasesUpdated = await syncPhaseBudgets(input.projectId, tasklineProjectId);
                console.log(`[TaskLineSync] Synced ${phasesUpdated} phase budgets`);
            } catch (err: any) {
                console.warn("[TaskLineSync] Phase budget sync failed:", err.message);
            }

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
