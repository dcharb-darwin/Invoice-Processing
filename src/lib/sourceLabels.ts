/**
 * Source document helpers — detect real vs demo documents.
 * Pattern: real source files are PDFs/XLSX. HTML files are generated demos.
 * [trace: agents.md §4 — Source Document Provenance]
 */

/** Returns true if the path points to a real source document (PDF, XLSX) vs a generated HTML demo */
export function isRealSource(path: string | null | undefined): boolean {
    if (!path) return false;
    const lower = path.toLowerCase();
    return lower.endsWith(".pdf") || lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

/** Returns appropriate label and CSS class for a source document link */
export function sourceLabel(path: string | null | undefined): { text: string; className: string } {
    if (!path) return { text: "", className: "" };
    if (isRealSource(path)) {
        return {
            text: "📄 Source PDF",
            className: "text-blue-700 dark:text-blue-300 hover:underline font-medium",
        };
    }
    return {
        text: "📄 Demo",
        className: "text-gray-400 dark:text-gray-500 hover:underline italic",
    };
}

/** Returns label for a signed/contract document link */
export function contractLabel(path: string | null | undefined): { text: string; className: string } {
    if (!path) return { text: "", className: "" };
    if (isRealSource(path)) {
        return {
            text: "📄 Contract PDF",
            className: "text-blue-700 dark:text-blue-300 hover:underline font-medium",
        };
    }
    return {
        text: "📄 Demo",
        className: "text-gray-400 dark:text-gray-500 hover:underline italic",
    };
}

/** Returns label for a signed invoice link */
export function signedLabel(path: string | null | undefined): { text: string; className: string } {
    if (!path) return { text: "", className: "" };
    if (isRealSource(path)) {
        return {
            text: "✅ Signed PDF",
            className: "text-blue-700 dark:text-blue-300 hover:underline font-medium",
        };
    }
    return {
        text: "✅ Demo",
        className: "text-gray-400 dark:text-gray-500 hover:underline italic",
    };
}
