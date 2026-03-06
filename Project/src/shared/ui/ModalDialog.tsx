import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalDialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
  width?: number;
};

export function ModalDialog({
  open,
  onClose,
  children,
  ariaLabel,
  width = 560,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", keyHandler);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keyHandler);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{ width: `min(100%, ${width}px)` }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
