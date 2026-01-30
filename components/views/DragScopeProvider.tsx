"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type DragScopeContextValue = {
  draggingId: number | null;
  draggingType: string | null;
  activeScopeId: number | null;
  isDragging: boolean;
  startDrag: (nodeId: number, componentType: string, scopeId: number) => void;
  endDrag: () => void;
  setActiveScopeId: (scopeId: number | null) => void;
};

const DragScopeContext = createContext<DragScopeContextValue | null>(null);

export function DragScopeProvider({ children }: { children: React.ReactNode }) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [activeScopeId, setActiveScopeId] = useState<number | null>(null);

  const startDrag = useCallback((nodeId: number, componentType: string, scopeId: number) => {
    setDraggingId(nodeId);
    setDraggingType(componentType);
    setActiveScopeId(scopeId);
  }, []);

  const endDrag = useCallback(() => {
    setDraggingId(null);
    setDraggingType(null);
    setActiveScopeId(null);
  }, []);

  const value = useMemo(
    () => ({
      draggingId,
      draggingType,
      activeScopeId,
      isDragging: draggingId !== null,
      startDrag,
      endDrag,
      setActiveScopeId
    }),
    [draggingId, draggingType, activeScopeId, startDrag, endDrag]
  );

  return <DragScopeContext.Provider value={value}>{children}</DragScopeContext.Provider>;
}

export function useDragScope() {
  return useContext(DragScopeContext);
}
