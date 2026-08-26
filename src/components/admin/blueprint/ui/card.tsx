import type { ReactNode } from "react";

export function BpCard({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <Tag className={`bp-card bp-frame ${className}`.trim()}>{children}</Tag>;
}

export function BpKicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bp-kicker ${className}`.trim()}>{children}</div>;
}

export function BpCardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bp-card-title ${className}`.trim()}>{children}</div>;
}
