type TrpcResponseEnvelope = {
    result?: {
        data?: {
            json?: unknown;
        };
    };
    error?: {
        json?: {
            message?: string;
        };
    };
};

const ipcBaseUrl = (process.env.IPC_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const tasklineBaseUrl = (process.env.TASKLINE_BASE_URL || "http://localhost:3002").replace(/\/+$/, "");

function assertCondition(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

async function parseTrpcResponse(response: Response): Promise<unknown> {
    const raw = (await response.json()) as TrpcResponseEnvelope;
    if (!response.ok || raw.error) {
        const message = raw.error?.json?.message || `${response.status} ${response.statusText}`;
        throw new Error(message);
    }
    return raw.result?.data?.json;
}

async function ipcQuery<T>(procedure: string, input?: Record<string, unknown>): Promise<T> {
    const query = input ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : "";
    const response = await fetch(`${ipcBaseUrl}/api/trpc/${procedure}${query}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    return (await parseTrpcResponse(response)) as T;
}

async function ipcMutate<T>(procedure: string, input: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${ipcBaseUrl}/api/trpc/${procedure}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: input }),
    });
    return (await parseTrpcResponse(response)) as T;
}

async function tasklineMutate<T>(procedure: string, input: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${tasklineBaseUrl}/api/trpc/${procedure}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: input }),
    });
    return (await parseTrpcResponse(response)) as T;
}

async function run(): Promise<void> {
    let createdProjectId: number | null = null;
    let createdTasklineProjectId: number | null = null;

    try {
        console.log(`\n[smoke] IPC base: ${ipcBaseUrl}`);
        console.log(`[smoke] TaskLine base: ${tasklineBaseUrl}`);

        const healthRes = await fetch(`${ipcBaseUrl}/api/health`);
        assertCondition(healthRes.ok, "IPC health endpoint is not reachable.");
        console.log("[smoke] IPC health: OK");

        const connection = await ipcQuery<{
            ok: boolean;
            userMessage: string;
            tasklineUrl: string;
        }>("sync.connectionStatus");
        assertCondition(connection.ok, `[connectionStatus] ${connection.userMessage}`);
        console.log(`[smoke] TaskLine connectivity: OK (${connection.tasklineUrl})`);

        const list = await ipcQuery<Array<{ id: number; name: string }>>("sync.listTasklineProjects");
        assertCondition(Array.isArray(list), "sync.listTasklineProjects did not return an array.");
        if (list.length > 0) {
            assertCondition(
                typeof list[0].id === "number" && typeof list[0].name === "string",
                "sync.listTasklineProjects returned malformed row shape."
            );
        }
        console.log(`[smoke] listTasklineProjects: OK (${list.length} rows)`);

        const runId = Date.now();
        const tempProject = await ipcMutate<{ id: number }>("projects.create", {
            name: `SMOKE-TASKLINE-${runId}`,
            type: "ST",
            projectManager: "Smoke Test",
            description: "Temporary project for taskline integration smoke test",
        });
        createdProjectId = tempProject.id;
        console.log(`[smoke] Created temp IPC project: ${createdProjectId}`);

        const push = await ipcMutate<{ tasklineProjectId: number }>("sync.pushToTaskline", {
            projectId: createdProjectId,
        });
        createdTasklineProjectId = push.tasklineProjectId;
        assertCondition(typeof createdTasklineProjectId === "number", "pushToTaskline did not return a TaskLine ID.");
        console.log(`[smoke] pushToTaskline: OK (TaskLine ID ${createdTasklineProjectId})`);

        const syncStatus = await ipcQuery<{
            linked: boolean;
            tasklineProjectId: number | null;
        }>("sync.status", { projectId: createdProjectId });
        assertCondition(syncStatus.linked === true, "sync.status did not report linked=true.");
        assertCondition(
            syncStatus.tasklineProjectId === createdTasklineProjectId,
            "sync.status tasklineProjectId does not match pushed project."
        );
        console.log("[smoke] sync.status: OK");

        const receive = await ipcMutate<{ action: "updated" | "created" }>("sync.receiveFromTaskline", {
            tasklineProjectId: createdTasklineProjectId,
        });
        assertCondition(
            receive.action === "updated",
            `receiveFromTaskline expected idempotent 'updated', got '${receive.action}'.`
        );
        console.log("[smoke] receiveFromTaskline idempotency: OK");

        const roundTrip = await ipcQuery<{ pass: boolean }>("spreadsheetSync.roundTripCheck", { projectId: 1 });
        assertCondition(roundTrip.pass === true, "spreadsheetSync.roundTripCheck failed.");
        console.log("[smoke] spreadsheet round-trip check: OK");

        console.log("\n[smoke] PASS: TaskLine + IPC integration checks completed.");
    } finally {
        if (createdTasklineProjectId !== null) {
            try {
                await tasklineMutate("projects.delete", { id: createdTasklineProjectId });
                console.log(`[smoke] Cleanup: deleted TaskLine project ${createdTasklineProjectId}`);
            } catch (error) {
                console.warn(
                    `[smoke] Cleanup warning: failed to delete TaskLine project ${createdTasklineProjectId}:`,
                    error instanceof Error ? error.message : error
                );
            }
        }

        if (createdProjectId !== null) {
            try {
                await ipcMutate("projects.delete", { id: createdProjectId });
                console.log(`[smoke] Cleanup: deleted IPC project ${createdProjectId}`);
            } catch (error) {
                console.warn(
                    `[smoke] Cleanup warning: failed to delete IPC project ${createdProjectId}:`,
                    error instanceof Error ? error.message : error
                );
            }
        }
    }
}

run().catch((error) => {
    console.error("\n[smoke] FAIL:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
