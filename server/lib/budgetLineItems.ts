/**
 * Shared budget line item helpers.
 * Consolidates the find-or-create pattern and contract-type-to-category mapping
 * used across contracts.ts, import.ts, and spreadsheetSync.ts.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import type { BudgetCategory } from "../db/schema.js";

/** Budget categories auto-generated per contract type. */
export const CONTRACT_TYPE_TO_BUDGET_CATEGORIES: Record<string, BudgetCategory[]> = {
    Design: ["Design", "Permitting"],
    CM_Services: ["CM_Services", "Inspector_Material"],
    Construction: ["Construction", "Misc"],
};

/** Find or create a budget line item for a project + category. Returns the BLI id. */
export async function findOrCreateBli(projectId: number, category: BudgetCategory): Promise<number> {
    const existing = await db.query.budgetLineItems.findFirst({
        where: and(
            eq(schema.budgetLineItems.projectId, projectId),
            eq(schema.budgetLineItems.category, category),
        ),
    });
    if (existing) return existing.id;

    const [created] = await db
        .insert(schema.budgetLineItems)
        .values({
            projectId,
            category,
            projectedCost: 0,
            percentScopeComplete: 0,
        })
        .returning();
    return created.id;
}

/** Ensure all budget line items for a contract type exist. */
export async function ensureBudgetLineItems(projectId: number, contractType: string): Promise<void> {
    const categories = CONTRACT_TYPE_TO_BUDGET_CATEGORIES[contractType] ?? [];
    for (const category of categories) {
        await findOrCreateBli(projectId, category);
    }
}
