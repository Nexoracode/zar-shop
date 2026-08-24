import type { ReactNode } from "react";

/**
 * The four registration marks the Industry system draws just outside a framed box. Rendered as
 * decorative spans; the parent must carry `bp-frame` (which is `position: relative`).
 */
export function BpCorners() {
  return (
    <>
      <i aria-hidden className="bp-corner bp-corner-tl" />
      <i aria-hidden className="bp-corner bp-corner-tr" />
      <i aria-hidden className="bp-corner bp-corner-bl" />
      <i aria-hidden className="bp-corner bp-corner-br" />
    </>
  );
}

export function BpCard({ children, className = "", corners = true, as: Tag = "div" }: { children: ReactNode; className?: string; corners?: boolean; as?: "div" | "section" | "article" }) {
  return (
    <Tag className={`bp-card ${corners ? "bp-frame" : ""} ${className}`.trim()}>
      {corners && <BpCorners />}
      {children}
    </Tag>
  );
}

export function BpKicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bp-kicker ${className}`.trim()}>{children}</div>;
}

export function BpCardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bp-card-title ${className}`.trim()}>{children}</div>;
}
