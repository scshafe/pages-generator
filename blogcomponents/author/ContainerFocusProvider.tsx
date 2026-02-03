"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ContainerFocusContextValue = {
  activeContainerId: number | null;
  setActiveContainerId: (id: number | null) => void;
  focusedNodeId: number | null;
  setFocusedNodeId: (id: number | null) => void;
  pendingInlineFocusId: number | null;
  setPendingInlineFocusId: (id: number | null) => void;
};

const ContainerFocusContext = createContext<ContainerFocusContextValue | null>(null);

export function ContainerFocusProvider({ children }: { children: ReactNode }) {
  const [activeContainerId, setActiveContainerId] = useState<number | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<number | null>(null);
  const [pendingInlineFocusId, setPendingInlineFocusId] = useState<number | null>(null);
  const value = useMemo(
    () => ({
      activeContainerId,
      setActiveContainerId,
      focusedNodeId,
      setFocusedNodeId,
      pendingInlineFocusId,
      setPendingInlineFocusId
    }),
    [activeContainerId, focusedNodeId, pendingInlineFocusId]
  );
  return <ContainerFocusContext.Provider value={value}>{children}</ContainerFocusContext.Provider>;
}

export function useContainerFocus() {
  const context = useContext(ContainerFocusContext);
  if (!context) {
    throw new Error("useContainerFocus must be used within ContainerFocusProvider");
  }
  return context;
}
