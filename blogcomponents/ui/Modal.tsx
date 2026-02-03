"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  size = "default",
  children
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "default" | "wide";
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={onClose}
    >
      <div
        className={`dialog${size === "wide" ? " dialog-wide" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h3 id="modal-title">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
