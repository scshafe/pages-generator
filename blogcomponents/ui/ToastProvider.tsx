"use client";

"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{
  push: (message: string, type?: ToastType) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const push = useCallback((message: string, type: ToastType = "info") => {
    if (type === "success") {
      toast.success(message);
      return;
    }
    if (type === "error") {
      toast.error(message);
      return;
    }
    toast(message);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster richColors closeButton />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
