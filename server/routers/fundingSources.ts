import { router, publicProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Funding sources router — CRUD.
 * [trace: discovery L100-106 — funding sources with budget codes]
 * springbrookBudgetCode is display-only — never writes to Springbrook.
 */
export const fundingSourcesRouter = router({
    list: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            return db.query.fundingSources.findMany({
                where: eq(schema.fundingSources.projectId, input.projectId),
            });
        }),

    create: publicProcedure
        .input(
            z.object({
                projectId: z.number(),
                sourceName: z.string().min(1),
                springbrookBudgetCode: z.string().optional(),
                allocatedAmount: z.number().default(0),
                yearAllocations: z.string().optional(), // JSON string
            })
        )
        .mutation(async ({ input }) => {
            const [source] = await db
                .insert(schema.fundingSources)
                .values(input)
                .returning();
            return source;
        }),

    update: publicProcedure
        .input(
            z.object({
                id: z.number(),
                sourceName: z.string().optional(),
                springbrookBudgetCode: z.string().optional(),
                allocatedAmount: z.number().optional(),
                yearAllocations: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            const [updated] = await db
                .update(schema.fundingSources)
                .set(data)
                .where(eq(schema.fundingSources.id, id))
                .returning();
            return updated;
        }),
});
