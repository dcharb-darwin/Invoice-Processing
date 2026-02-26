/**
 * Source Reference Resolver — storage-agnostic, format-agnostic.
 *
 * Design pattern (PRD §3.7): The system stores a URL string for source
 * documents. It makes NO assumptions about:
 *   - WHERE the file lives (local, SharePoint, GDrive, S3, API endpoint)
 *   - WHAT format the file is (PDF, Excel, text, image, HTML)
 *
 * The ONLY distinction that matters for display:
 *   1. Is this a real reference to actual source material?
 *   2. Is this a local demo/mockup we generated for the prototype?
 *   3. Is there no reference at all?
 *
 * [trace: agents.md §4 — Source Document Provenance]
 * [trace: docs/comprehensive-prd.md §3.7 — Source Reference Drill-and-Display]
 */

/** Detect if a path is a local demo mockup (generated HTML in /documents/) */
function isDemoMockup(path: string): boolean {
    // Demo mockups are local HTML files we generated for the prototype
    // They live in /documents/ and end with .html
    return path.includes("/documents/") && path.toLowerCase().endsWith(".html");
}

export type SourceRefType = "real" | "demo" | "none";

export interface SourceRef {
    type: SourceRefType;
    label: string;
    /** Alias for label — used by page components */
    text: string;
    className: string;
}

/**
 * Resolve a source reference URL into a display label and style.
 *
 * @param path - The URL/path stored in the database (any format, any origin)
 * @param context - What kind of document this is (e.g., "Source", "Contract", "Signed")
 */
export function resolveSourceRef(
    path: string | null | undefined,
    context: "Source" | "Contract" | "Signed" | "Document" = "Document"
): SourceRef {
    if (!path) {
        return { type: "none", label: "", text: "", className: "" };
    }

    if (isDemoMockup(path)) {
        return {
            type: "demo",
            label: `📄 Demo ${context}`,
            text: `📄 Demo ${context}`,
            className: "text-gray-400 dark:text-gray-500 hover:underline italic",
        };
    }

    // Everything else is a real reference — could be PDF, XLSX, SharePoint URL,
    // GDrive link, API endpoint, local file, etc. We don't care what it is.
    return {
        type: "real",
        label: `📄 ${context}`,
        text: `📄 ${context}`,
        className: "text-blue-700 dark:text-blue-300 hover:underline font-medium",
    };
}

// Convenience aliases matching the existing API surface consumed by pages
export function sourceLabel(path: string | null | undefined) {
    return resolveSourceRef(path, "Source");
}

export function contractLabel(path: string | null | undefined) {
    return resolveSourceRef(path, "Contract");
}

export function signedLabel(path: string | null | undefined) {
    return resolveSourceRef(path, "Signed");
}
