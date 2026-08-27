"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, X } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { isAdminNavItemActive, visibleAdminNavGroups } from "@/modules/admin/navigation";
import { getSidebarCollapsed, subscribeToSidebarCollapsed } from "@/lib/admin-sidebar-state";
import { BpButton } from "./ui/button";
import { BpPopover } from "./ui/popover";

type Props = {
  role: UserRole;
  fullName: string;
  /** Mobile drawer control — the shell owns the open state so the topbar can toggle it. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** Read from the cookie on the server, so the first paint already has the right width. */
  initialCollapsed: boolean;
};

export function BlueprintSidebar({ role, fullName, mobileOpen, onCloseMobile, initialCollapsed }: Props) {
  const pathname = usePathname();
  const groups = useMemo(() => visibleAdminNavGroups(role), [role]);
  /*
   * One accordion at a time: opening a group closes whichever was open. `undefined` means the
   * reader has not chosen yet, so the group holding the current route opens on its own and a
   * deep link never lands on a collapsed menu.
   */
  const [openGroup, setOpenGroup] = useState<string | null | undefined>(undefined);
  const serverSnapshot = useCallback(() => initialCollapsed, [initialCollapsed]);
  const isCollapsed = useSyncExternalStore(subscribeToSidebarCollapsed, getSidebarCollapsed, serverSnapshot);
  const showLabels = !isCollapsed;

  function isGroupOpen(group: (typeof groups)[number]) {
    // Collapsed, "open" means a flyout is showing, and one of those has to be asked for — the
    // route-follows fallback would pop a panel open on every page load.
    if (openGroup === undefined) return !isCollapsed && group.items.some((item) => isAdminNavItemActive(item.href, pathname));
    return openGroup === group.title;
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
        return (
          <NavGroup
            key={group.title}
            group={group}
            pathname={pathname}
            collapsed={isCollapsed}
            open={isGroupOpen(group)}
            onToggle={() => setOpenGroup(isGroupOpen(group) ? null : group.title)}
            onClose={() => setOpenGroup(null)}
            onNavigate={onCloseMobile}
          />
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

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="bp-scroll sticky top-0 hidden h-dvh flex-none flex-col gap-6 overflow-y-auto border-e border-[var(--bp-divider)] lg:flex"
        style={{ width: isCollapsed ? 76 : 240, padding: isCollapsed ? "20px 14px" : 20 }}
      >
        {brand}
        {nav}
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
          </aside>
        </div>
      )}
    </>
  );
}

type NavGroupData = ReturnType<typeof visibleAdminNavGroups>[number];

/**
 * One accordion group in the rail.
 *
 * Collapsed, there is no room to expand under the icon — and hiding the items there would leave
 * half the panel unreachable — so the group opens as a flyout beside the rail instead. Expanded,
 * it behaves as an ordinary accordion.
 */
function NavGroup({ group, pathname, collapsed, open, onToggle, onClose, onNavigate }: {
  group: NavGroupData;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const GroupIcon = group.icon;
  const groupActive = group.items.some((item) => isAdminNavItemActive(item.href, pathname));
  const expandedInline = open && !collapsed;

  const links = group.items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      // Closing the group on click only makes sense collapsed, where it's a flyout popover that
      // should tuck itself away after navigating — expanded, it's an ordinary accordion, and
      // closing it there was the bug: picking an item inside it collapsed the whole group.
      onClick={() => { onNavigate(); if (collapsed) onClose(); }}
      data-active={isAdminNavItemActive(item.href, pathname)}
      className="bp-nav-item bp-nav-sub"
    >
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        className="bp-nav-item"
        data-active={collapsed && groupActive}
        aria-expanded={open}
        aria-haspopup={collapsed ? "dialog" : undefined}
        title={collapsed ? group.title : undefined}
        onClick={onToggle}
      >
        <GroupIcon size={18} strokeWidth={1.5} className="flex-none" />
        {!collapsed && <>
          <span className="flex-1 text-right">{group.title}</span>
          <ChevronDown size={13} strokeWidth={1.5} className={`flex-none opacity-60 transition-transform ${expandedInline ? "rotate-180" : ""}`} />
        </>}
      </button>

      {expandedInline && <div className="mt-0.5 flex flex-col gap-0.5">{links}</div>}

      {collapsed && (
        <BpPopover open={open} anchorRef={triggerRef} onClose={onClose} label={group.title} width={210} placement="beside">
          <strong className="mb-2 block border-b border-[var(--bp-divider)] pb-2 text-[13px]">{group.title}</strong>
          <div className="flex flex-col gap-0.5">{links}</div>
        </BpPopover>
      )}
    </div>
  );
}
