import SourceDocLink from "./SourceDocLink.js";

export default function InvoiceDocumentLinks({
  sourcePdfPath,
  signedPdfPath,
  onClick,
}: {
  sourcePdfPath?: string | null;
  signedPdfPath?: string | null;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
}) {
  if (!sourcePdfPath && !signedPdfPath) return null;

  return (
    <span className="flex items-center gap-1.5" onClick={onClick}>
      <SourceDocLink path={sourcePdfPath} context="Source" />
      {sourcePdfPath && signedPdfPath && (
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          ·
        </span>
      )}
      <SourceDocLink path={signedPdfPath} context="Signed" />
    </span>
  );
}
