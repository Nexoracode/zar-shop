"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronsLeftRight, LogOut, Store, X } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { isAdminNavItemActive, visibleAdminNavGroups } from "@/modules/admin/navigation";
import { getSidebarCollapsed, getSidebarCollapsedServerSnapshot, setSidebarCollapsed, subscribeToSidebarCollapsed } from "@/lib/admin-sidebar-state";
import { BpButton } from "./ui/button";

type Props = {
  role: UserRole;
  fullName: string;
  isLoggingOut: boolean;
  onLogout: () => void;
  /** Mobile drawer control — the shell owns the open state so the topbar can toggle it. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function BlueprintSidebar({ role, fullName, isLoggingOut, onLogout, mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const groups = useMemo(() => visibleAdminNavGroups(role), [role]);
  // Only groups the user has clicked live in state; the rest fall back to "open when they hold
  // the current route", so a deep link never lands on a collapsed menu.
  const [toggledGroups, setToggledGroups] = useState<Record<string, boolean>>({});
  const isCollapsed = useSyncExternalStore(subscribeToSidebarCollapsed, getSidebarCollapsed, getSidebarCollapsedServerSnapshot);
  const showLabels = !isCollapsed;

  function isGroupOpen(group: (typeof groups)[number]) {
    return toggledGroups[group.title] ?? group.items.some((item) => isAdminNavItemActive(item.href, pathname));
  }

  const nav = (
    <nav aria-label="منوی اصلی مدیریت" className="bp-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {groups.map((group) => {
        // A one-item group (the dashboard) is a plain link, not an accordion.
        if (group.items.length === 1) {
          const item = group.items[0];
          const active = isAdminNavItemActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={onCloseMobile} data-active={active} className="bp-nav-item" title={isCollapsed ? item.label : undefined}>
              <Icon size={18} strokeWidth={1.5} className="flex-none" />
              {showLabels && <span>{item.label}</span>}
            </Link>
          );
        }
        const GroupIcon = group.icon;
        const expanded = isGroupOpen(group) && showLabels;
        const groupActive = group.items.some((item) => isAdminNavItemActive(item.href, pathname));
        return (
          <div key={group.title}>
            <button
              type="button"
              className="bp-nav-item"
              data-active={isCollapsed && groupActive}
              aria-expanded={expanded}
              title={isCollapsed ? group.title : undefined}
              onClick={() => setToggledGroups((current) => ({ ...current, [group.title]: !isGroupOpen(group) }))}
            >
              <GroupIcon size={18} strokeWidth={1.5} className="flex-none" />
              {showLabels && <>
                <span className="flex-1 text-right">{group.title}</span>
                <ChevronDown size={13} strokeWidth={1.5} className={`flex-none opacity-60 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </>}
            </button>
            {expanded && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isAdminNavItemActive(item.href, pathname);
                  return (
                    <Link key={item.href} href={item.href} onClick={onCloseMobile} data-active={active} className="bp-nav-item bp-nav-sub">
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-1 pb-2 pt-1">
      <span className="flex h-[34px] w-[34px] flex-none items-center justify-center border border-[var(--bp-accent)] text-base font-bold text-[var(--bp-accent-700)]">ز</span>
      {showLabels && <div className="min-w-0">
        <strong className="block truncate text-[19px] font-bold leading-tight">زر گالری</strong>
        <span className="bp-muted block truncate text-[11px]">{fullName}</span>
      </div>}
    </div>
  );

  const collapseToggle = (
    <button type="button" onClick={() => setSidebarCollapsed(!isCollapsed)} className="bp-nav-item border-[var(--bp-divider)]" aria-label={isCollapsed ? "باز کردن منو" : "جمع کردن منو"}>
      <ChevronsLeftRight size={16} strokeWidth={1.5} className="flex-none" />
      {showLabels && <span className="text-[13px]">جمع کردن</span>}
    </button>
  );

  const footer = (
    <div className="mt-auto flex flex-col gap-1 pt-4">
      <Link href="/" className="bp-nav-item" title={isCollapsed ? "مشاهده فروشگاه" : undefined}>
        <Store size={16} strokeWidth={1.5} className="flex-none" />
        {showLabels && <span>مشاهده فروشگاه</span>}
      </Link>
      <BpButton variant="ghost" isPending={isLoggingOut} onClick={onLogout} className="justify-start gap-2.5 px-3 text-[13px] text-[var(--bp-danger)]" aria-label="خروج از حساب">
        {!isLoggingOut && <LogOut size={16} strokeWidth={1.5} />}
        {showLabels && <span>خروج از حساب</span>}
      </BpButton>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="bp-scroll sticky top-0 hidden h-dvh flex-none flex-col gap-6 overflow-y-auto border-e border-[var(--bp-divider)] lg:flex"
        style={{ width: isCollapsed ? 76 : 240, padding: isCollapsed ? "20px 14px" : 20 }}
      >
        {brand}
        {nav}
        <div className="mt-auto flex flex-col gap-1">
          {collapseToggle}
          {footer}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[120] bg-[color-mix(in_srgb,#0b0c0d_55%,transparent)] lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseMobile(); }}>
          <aside className="bp-scroll me-auto flex h-full w-[min(84vw,300px)] flex-col gap-4 overflow-y-auto border-e border-[var(--bp-divider)] bg-[var(--bp-bg)] p-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm">منوی مدیریت</strong>
              <BpButton isIconOnly aria-label="بستن منوی مدیریت" onClick={onCloseMobile}><X size={17} /></BpButton>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
