import type { ReactNode } from "react";
import type { AdminTone } from "@/modules/admin/labels";

/** The design system's own accent tone has no equivalent in `AdminTone`, so it is added here. */
export type BpTagTone = AdminTone | "accent";

const toneClass: Record<BpTagTone, string> = {
  neutral: "bp-tag-neutral",
  info: "bp-tag-info",
  success: "bp-tag-success",
  warning: "bp-tag-warning",
  danger: "bp-tag-danger",
  gold: "bp-tag-gold",
  accent: "bp-tag-accent",
};

export function BpTag({ children, tone = "neutral", size = "sm", withDot = false, className = "" }: { children: ReactNode; tone?: BpTagTone; size?: "sm" | "md"; withDot?: boolean; className?: string }) {
  return (
    <span className={`bp-tag ${toneClass[tone]} ${size === "md" ? "bp-tag-md" : ""} ${className}`.replace(/\s+/g, " ").trim()}>
      {withDot && <i aria-hidden className="block h-[5px] w-[5px] flex-none rounded-full bg-current" />}
      {children}
    </span>
  );
}
