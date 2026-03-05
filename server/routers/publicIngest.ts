import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { router, publicProcedure } from "../trpc.js";

function classifyWorkbook(sheetNames: string[]): "budget" | "grant" | "project" {
    const normalized = sheetNames.map((s) => s.toLowerCase());
    if (normalized.some((s) => s.includes("grant"))) return "grant";
    if (normalized.some((s) => s.includes("budget") || s.includes("funding") || s.includes("cip") || s.includes("cfp"))) {
        return "budget";
    }
    return "project";
}

export const publicIngestRouter = router({
    listSources: publicProcedure.query(async () => {
        return db.query.publicDocumentSources.findMany({
            orderBy: [desc(schema.publicDocumentSources.id)],
        });
    }),

    upsertSource: publicProcedure
        .input(z.object({
            id: z.number().optional(),
            name: z.string().min(1),
            sourceType: z.enum(schema.PUBLIC_SOURCE_TYPES),
            location: z.string().min(1),
            parserHint: z.string().optional(),
            enabled: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            if (input.id) {
                const [updated] = await db
                    .update(schema.publicDocumentSources)
                    .set({
                        name: input.name,
                        sourceType: input.sourceType,
                        location: input.location,
                        parserHint: input.parserHint,
                        enabled: input.enabled ?? true,
                    })
                    .where(eq(schema.publicDocumentSources.id, input.id))
                    .returning();
                return updated;
            }
            const [created] = await db
                .insert(schema.publicDocumentSources)
                .values({
                    name: input.name,
                    sourceType: input.sourceType,
                    location: input.location,
                    parserHint: input.parserHint,
                    enabled: input.enabled ?? true,
                })
                .returning();
            return created;
        }),

    run: publicProcedure
        .input(z.object({ sourceIds: z.array(z.number()).optional() }).optional())
        .mutation(async ({ input }) => {
            const sources = await db.query.publicDocumentSources.findMany({
                where: input?.sourceIds?.length
                    ? inArray(schema.publicDocumentSources.id, input.sourceIds)
                    : eq(schema.publicDocumentSources.enabled, true),
            });
            const [run] = await db
                .insert(schema.publicIngestRuns)
                .values({
                    status: "running",
                    sourceCount: sources.length,
                })
                .returning();

            let recordCount = 0;
            let issueCount = 0;

            for (const source of sources) {
                try {
                    if (source.sourceType === "local_file") {
                        const resolved = path.isAbsolute(source.location)
                            ? source.location
                            : path.resolve(process.cwd(), source.location);
                        const data = await fs.readFile(resolved);
                        const ext = path.extname(resolved).toLowerCase();

                        if (ext === ".xlsx") {
                            const wb = XLSX.read(data, { type: "buffer" });
                            const recordType = classifyWorkbook(wb.SheetNames);
                            await db.insert(schema.publicIngestRecords).values({
                                runId: run.id,
                                sourceId: source.id,
                                recordType,
                                status: "parsed",
                                confidence: 0.9,
                                message: `Parsed workbook with ${wb.SheetNames.length} sheets`,
                                provenance: JSON.stringify({ location: source.location, type: source.sourceType }),
                                payloadJson: JSON.stringify({ sheetNames: wb.SheetNames }),
                            });
                            recordCount++;
                        } else if (ext === ".pdf") {
                            await db.insert(schema.publicIngestRecords).values({
                                runId: run.id,
                                sourceId: source.id,
                                recordType: "unknown",
                                status: "review_required",
                                confidence: 0.4,
                                message: "PDF source requires deterministic parser or manual review.",
                                provenance: JSON.stringify({ location: source.location, type: source.sourceType }),
                            });
                            recordCount++;
                            issueCount++;
                        } else {
                            await db.insert(schema.publicIngestRecords).values({
                                runId: run.id,
                                sourceId: source.id,
                                recordType: "unknown",
                                status: "error",
                                confidence: 0,
                                message: `Unsupported local file extension: ${ext || "none"}`,
                                provenance: JSON.stringify({ location: source.location, type: source.sourceType }),
                            });
                            recordCount++;
                            issueCount++;
                        }
                    } else {
                        const res = await fetch(source.location);
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}`);
                        }
                        const arr = await res.arrayBuffer();
                        const bytes = Buffer.from(arr);
                        const urlExt = path.extname(new URL(source.location).pathname).toLowerCase();
                        const contentType = res.headers.get("content-type") ?? "";

                        if (urlExt === ".xlsx" || contentType.includes("spreadsheet")) {
                            const wb = XLSX.read(bytes, { type: "buffer" });
                            const recordType = classifyWorkbook(wb.SheetNames);
                            await db.insert(schema.publicIngestRecords).values({
                                runId: run.id,
                                sourceId: source.id,
                                recordType,
                                status: "parsed",
                                confidence: 0.85,
                                message: `Parsed public workbook with ${wb.SheetNames.length} sheets`,
                                provenance: JSON.stringify({ location: source.location, type: source.sourceType }),
                                payloadJson: JSON.stringify({ sheetNames: wb.SheetNames }),
                            });
                            recordCount++;
                        } else {
                            await db.insert(schema.publicIngestRecords).values({
                                runId: run.id,
                                sourceId: source.id,
                                recordType: "unknown",
                                status: "review_required",
                                confidence: 0.5,
                                message: "Public URL is not a deterministic XLSX source; manual review required.",
                                provenance: JSON.stringify({ location: source.location, type: source.sourceType }),
                            });
                            recordCount++;
                            issueCount++;
                        }
                    }
                } catch (err: any) {
                    await db.insert(schema.publicIngestRecords).values({
                        runId: run.id,
                        sourceId: source.id,
                        recordType: "unknown",
                        status: "error",
                        confidence: 0,
                        message: `Ingestion failed: ${err.message}`,
                        provenance: JSON.stringify({ location: source.location, type: source.sourceType }),
                    });
                    recordCount++;
                    issueCount++;
                }
            }

            const [updated] = await db
                .update(schema.publicIngestRuns)
                .set({
                    status: "completed",
                    recordCount,
                    issueCount,
                    completedAt: new Date().toISOString(),
                })
                .where(eq(schema.publicIngestRuns.id, run.id))
                .returning();

            return { runId: updated.id, status: updated.status };
        }),

    runReport: publicProcedure
        .input(z.object({ runId: z.number() }))
        .query(async ({ input }) => {
            const run = await db.query.publicIngestRuns.findFirst({
                where: eq(schema.publicIngestRuns.id, input.runId),
            });
            if (!run) throw new Error(`Run ${input.runId} not found`);

            const records = await db.query.publicIngestRecords.findMany({
                where: eq(schema.publicIngestRecords.runId, input.runId),
                with: { source: true },
                orderBy: [desc(schema.publicIngestRecords.id)],
            });
            const issues = records.filter((r) => r.status !== "parsed");
            const reviewQueueCount = records.filter((r) => r.status === "review_required").length;

            return {
                metrics: {
                    runId: run.id,
                    status: run.status,
                    sourceCount: run.sourceCount,
                    recordCount: run.recordCount,
                    issueCount: run.issueCount,
                    startedAt: run.startedAt,
                    completedAt: run.completedAt,
                },
                issues,
                reviewQueueCount,
                records,
            };
        }),
});
