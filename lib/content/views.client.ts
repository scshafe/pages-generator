import { apiFetch } from "@/lib/api/client";
import type { ViewSummary } from "@/lib/content/types";

export async function listViews(): Promise<ViewSummary[]> {
  return apiFetch<ViewSummary[]>("/views");
}

export async function createView(input: {
  path: string;
  title: string;
  name?: string;
  description?: string;
}): Promise<ViewSummary> {
  return apiFetch<ViewSummary>("/views", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
