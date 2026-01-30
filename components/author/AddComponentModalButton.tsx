"use client";

import { useState } from "react";
import { AddComponentForm } from "@/components/author/AddComponentForm";
import { Modal } from "@/components/ui/Modal";
import { AddIcon } from "@/components/ui/icons";

export function AddComponentModalButton({
  parentNodeId,
  buttonLabel = "Add Component"
}: {
  parentNodeId: number;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="button add-component add-component-bottom icon-only"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <AddIcon size={26} strokeWidth={2} aria-hidden />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} size="wide">
        <AddComponentForm
          parentNodeId={parentNodeId}
          submitLabel="Save"
          submitClassName="button success"
          onAdded={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
