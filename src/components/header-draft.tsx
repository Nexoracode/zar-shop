"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";

// The page builder keeps its edits of the header (name, logo, menu) in the browser until "save", and the header is
// rendered on the server. This is how the header shows the draft meanwhile: the builder hands it over here and the small
// client pieces below draw the draft in place of what the server rendered.

export type HeaderDraft = {
  identity: { storeName: string; logo: { url: string; alt: string } | null } | null;
  menu: HomepageMenuItem[] | null;
};

const empty: HeaderDraft = { identity: null, menu: null };
let current: HeaderDraft = empty;
const listeners = new Set<() => void>();

export function setHeaderDraft(next: HeaderDraft) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHeaderDraft() {
  return useSyncExternalStore(subscribe, () => current, () => empty);
}

/** The header's logo: the draft's name and logo when the builder has edited them, otherwise what the server rendered (`children`). */
export function HeaderLogo({ variant, children }: { variant: "general" | "gold"; children: ReactNode }) {
  const identity = useHeaderDraft().identity;
  if (!identity) return <>{children}</>;
  if (identity.logo) {
    return (
      <span className={`relative block h-10 ${variant === "gold" ? "w-24 sm:w-28" : "w-28"}`}>
        <Image src={identity.logo.url} alt={identity.logo.alt || identity.storeName} fill sizes="112px" className="object-contain" />
      </span>
    );
  }
  if (variant === "general") return <strong className="text-base font-bold text-[var(--brand-primary)]">{identity.storeName}</strong>;
  return (
    <span className="flex items-center gap-2.5 leading-none">
      <span className="grid size-9 rotate-45 place-items-center border border-[var(--brand-primary)]"><span className="-rotate-45 text-xs font-bold text-[var(--brand-primary)]">{identity.storeName.slice(0, 2)}</span></span>
      <strong className="text-sm font-bold text-[var(--brand-primary)]">{identity.storeName}</strong>
    </span>
  );
}

/** The menu's links as the builder's draft has them, or the given ones. */
export function useDraftMenuItems(items: HomepageMenuItem[]) {
  return useHeaderDraft().menu ?? items;
}

/** The gold header's menu links. */
export function GoldMenuLinks({ items }: { items: HomepageMenuItem[] }) {
  const links = useDraftMenuItems(items);
  return <>{links.map((item) => <Link key={item.id} href={item.href} className="flex h-full shrink-0 items-center border-b-2 border-transparent transition hover:border-[var(--success)] hover:text-[var(--success)]">{item.label}</Link>)}</>;
}
