/**
 * Shared monetary conversion utility.
 * Used by import.ts, financeReconciliation.ts, and any router that parses dollar values.
 */

/** Convert a dollar value (number, string with $, commas, etc.) to cents (integer). */
export function toCents(val: unknown): number {
    if (val == null || val === "") return 0;
    const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[$,]/g, ""));
    return isNaN(n) ? 0 : Math.round(n * 100);
}
