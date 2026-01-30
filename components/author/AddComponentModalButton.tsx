"use client";

import { useState } from "react";
import { AddComponentForm } from "@/components/author/AddComponentForm";
import { Modal } from "@/components/ui/Modal";

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
      <button className="button add-component add-component-bottom" type="button" onClick={() => setOpen(true)}>
        {buttonLabel}
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
