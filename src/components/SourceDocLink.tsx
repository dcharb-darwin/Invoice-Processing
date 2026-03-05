import { resolveSourceRef } from "../lib/sourceLabels.js";

export default function SourceDocLink({
  path,
  context = "Document",
  className,
  onClick,
}: {
  path: string | null | undefined;
  context?: "Source" | "Contract" | "Signed" | "Document";
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  if (!path) return null;
  const ref = resolveSourceRef(path, context);
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      className={className || `text-xs ${ref.className}`}
      onClick={onClick}
    >
      {ref.text}
    </a>
  );
}
