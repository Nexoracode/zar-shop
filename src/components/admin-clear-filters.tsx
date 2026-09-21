"use client";

import { X } from "lucide-react";
import { BpButton, BpLinkButton } from "@/components/admin/blueprint/ui/button";

/**
 * The way back from a search or filter that found nothing — the action of every list's "not found"
 * state. A server-driven list passes the `href` of its own bare path (dropping every search param);
 * a list filtered in local state passes an `onClick` that resets that state.
 */
export function AdminClearFilters({ href, onClick }: { href?: string; onClick?: () => void }) {
  const content = <><X size={14} strokeWidth={1.8} />پاک‌کردن فیلترها و جستجو</>;
  if (href) return <BpLinkButton href={href} variant="secondary" className="gap-2">{content}</BpLinkButton>;
  return <BpButton type="button" variant="secondary" className="gap-2" onClick={onClick}>{content}</BpButton>;
}
