import { type ReactNode, useEffect } from "react";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  panelStyle?: React.CSSProperties;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  backdropClassName?: string;
  backdropStyle?: React.CSSProperties;
}

export default function ModalShell({
  open,
  onClose,
  children,
  panelClassName = "rounded-xl border shadow-2xl",
  panelStyle,
  closeOnBackdrop = true,
  closeOnEscape = true,
  backdropClassName = "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",
  backdropStyle,
}: ModalShellProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return (
    <div
      className={backdropClassName}
      style={backdropStyle}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={panelClassName}
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          ...panelStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
