"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { VocabSegment } from "@/lib/content/terminology.types";

type VocabContextValue = {
  segmentsByNodeId: Record<number, VocabSegment[]>;
};

const VocabContext = createContext<VocabContextValue | null>(null);

export function VocabProvider({
  segmentsByNodeId,
  children
}: {
  segmentsByNodeId: Record<number, VocabSegment[]>;
  children: ReactNode;
}) {
  return (
    <VocabContext.Provider value={{ segmentsByNodeId }}>{children}</VocabContext.Provider>
  );
}

export function useVocabSegments(nodeId: number) {
  const context = useContext(VocabContext);
  if (!context) return null;
  return context.segmentsByNodeId[nodeId] ?? null;
}
