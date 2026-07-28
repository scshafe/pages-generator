// Canonical form for view paths: leading slash, no trailing slash, no
// duplicate separators. Both static-param generation and path lookup must
// normalize through here so a malformed stored path (e.g. "index/" or
// "//index") cannot generate a page that then fails to resolve.
export function normalizeViewPath(raw: string | undefined | null): string {
  if (!raw) return "/";
  const collapsed = raw.trim().replace(/\/+/g, "/");
  const trimmed = collapsed.replace(/\/+$/, "");
  if (trimmed === "" || trimmed === "/") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function viewPathSegments(raw: string | undefined | null): string[] {
  const normalized = normalizeViewPath(raw);
  return normalized === "/" ? [] : normalized.slice(1).split("/");
}

// Route prefixes owned by dedicated app routes; CMS views must not claim
// them or the static export would emit conflicting pages.
export const RESERVED_VIEW_PATH_PREFIXES = [
  "/projects",
  "/settings",
  "/terminology",
  "/views",
  "/posts"
];

export function isReservedViewPath(raw: string | undefined | null): boolean {
  const normalized = normalizeViewPath(raw);
  return RESERVED_VIEW_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
