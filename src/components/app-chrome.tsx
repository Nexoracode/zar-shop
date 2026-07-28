"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const isStandalone = pathname.startsWith("/admin") || pathname.startsWith("/invoices/");
  return <>{!isStandalone && header}{children}{!isStandalone && footer}</>;
}
