"use client";

import { usePathname } from "next/navigation";
import { AuthorPanel } from "@/blogcomponents/author/AuthorPanel";

export function AuthorPanelGate() {
  const pathname = usePathname();
  if (pathname?.startsWith("/settings")) return null;
  return <AuthorPanel />;
}
