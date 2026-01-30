import { siteConfig } from "@/site.config";
import { logInfo } from "@/lib/utils/logging";

const baseUrl = siteConfig.authorApiBaseUrl;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${baseUrl}${path}`;
  const start = performance.now();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    cache: "no-store"
  });

  const duration = Math.round((performance.now() - start) * 10) / 10;
  logInfo(`→ ${options?.method ?? "GET"} ${path}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as T;
  logInfo(`← ${response.status} ${path} (${duration}ms)`);
  return data;
}
