/**
 * Shared utility: format cents into a readable dollar amount.
 * The DB stores all money values in cents to avoid floating point issues.
 */
export function formatMoney(cents: number): string {
    const dollars = cents / 100;
    return dollars.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

/**
 * Format a date string (ISO) into a readable format.
 */
export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * Percentage formatting.
 */
export function formatPercent(value: number): string {
    return `${Math.round(value)}%`;
}
