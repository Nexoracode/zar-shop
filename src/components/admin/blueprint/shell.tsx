"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, Globe, LogOut, Menu, Moon, PanelRight, Sun, UserRound } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { formatDateTime, formatMoney } from "@/lib/format";
import { userRoleLabels } from "@/modules/admin/labels";
import { getResolvedAdminTheme, setAdminThemePreference, subscribeToAdminTheme } from "@/lib/admin-theme";
import { getSidebarCollapsed, setSidebarCollapsed, subscribeToSidebarCollapsed } from "@/lib/admin-sidebar-state";
import { AdminTemplateProvider } from "@/components/admin/template-context";
import { useStickyHeaderOffset } from "@/components/admin/use-sticky-offset";
import { BlueprintSidebar } from "./sidebar";
import { BpButton } from "./ui/button";
import { BpPopover } from "./ui/popover";
import { BpTag } from "./ui/tag";

type AdminUser = { firstName: string | null; lastName: string | null; email: string | null; role: UserRole };

type Props = {
  user: AdminUser;
  showGoldPrice: boolean;
  goldPrice: string | null;
  goldFetchedAt: string | null;
  notificationCount: number;
  sidebarCollapsed: boolean;
  children: ReactNode;
};

export function BlueprintShell({ user, showGoldPrice, goldPrice, goldFetchedAt, notificationCount, sidebarCollapsed, children }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"user" | "bell" | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const userRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const theme = useSyncExternalStore(subscribeToAdminTheme, getResolvedAdminTheme, () => "light");
  // The rail's own state, read here because its toggle now lives in this header.
  const railServerSnapshot = useCallback(() => sidebarCollapsed, [sidebarCollapsed]);
  const railCollapsed = useSyncExternalStore(subscribeToSidebarCollapsed, getSidebarCollapsed, railServerSnapshot);
  useStickyHeaderOffset(headerRef, shellRef);
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مدیر فروشگاه";

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "zar-dark" : "zar";
  }, [theme]);

  useEffect(() => () => { document.documentElement.dataset.theme = "zar"; }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div ref={shellRef} dir="rtl" className="bp-root flex min-h-dvh flex-col">
      {/* Full-width, above the rail too — like WordPress's own admin bar, not scoped to the
          content column the way it used to be. */}
      <header ref={headerRef} className="bp-dark-bar sticky top-0 z-40 flex h-12 flex-none items-center justify-between gap-3 border-b border-[var(--bp-sidebar-border)] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 flex-none items-center justify-center border border-[var(--bp-sidebar-border)] text-xs font-bold">ز</span>
          <strong className="hidden truncate text-[13px] font-bold sm:block">زر گالری</strong>

          {/* Desktop only: on mobile the rail is a drawer with its own trigger below. */}
          <div className="hidden lg:block">
            <BpButton
              isIconOnly
              size="sm"
              aria-label={railCollapsed ? "باز کردن منوی کناری" : "جمع کردن منوی کناری"}
              aria-expanded={!railCollapsed}
              title={railCollapsed ? "باز کردن منوی کناری" : "جمع کردن منوی کناری"}
              onClick={() => setSidebarCollapsed(!railCollapsed)}
            >
              {/* Same glyph both states — it just rotates, so the toggle reads as one smooth flip instead of a glyph swap. */}
              <PanelRight size={15} className={`transition-transform duration-300 ease-out ${railCollapsed ? "rotate-180" : ""}`} />
            </BpButton>
          </div>
          {/* Wrapped in a plain div: `.bp-btn` sets `display` from an unlayered stylesheet, so a
              `lg:hidden` on the button itself never wins and the menu stayed visible on desktop. */}
          <div className="lg:hidden">
            <BpButton isIconOnly size="sm" aria-label="باز کردن منوی مدیریت" onClick={() => setMobileOpen(true)}>
              <Menu size={16} />
            </BpButton>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {showGoldPrice && (
            <span className="hidden items-center gap-1.5 whitespace-nowrap border border-[var(--bp-sidebar-border)] px-2 py-1 text-[11px] sm:flex" title={goldFetchedAt ? `آخرین بروزرسانی: ${formatDateTime(goldFetchedAt)}` : undefined}>
              <span className="bp-muted">طلای ۱۸</span>
              <strong className="font-bold">{goldPrice ? formatMoney(goldPrice) : "نامشخص"}</strong>
            </span>
          )}

          <Link href="/" aria-label="مشاهده فروشگاه" title="مشاهده فروشگاه" className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm">
            <Globe size={15} />
          </Link>

          <BpButton ref={bellRef} isIconOnly size="sm" aria-label="نمایش اعلان‌ها" aria-haspopup="dialog" aria-expanded={openMenu === "bell"} onClick={() => setOpenMenu((current) => current === "bell" ? null : "bell")} className="relative">
            <Bell size={15} />
            {notificationCount > 0 && (
              <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bp-danger)] px-1 text-[10px] font-bold text-[var(--bp-bg)]">
                {notificationCount.toLocaleString("fa-IR")}
              </span>
            )}
          </BpButton>

          <BpButton
            isIconOnly
            size="sm"
            aria-label={theme === "dark" ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"}
            onClick={() => setAdminThemePreference(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </BpButton>

          <button
            ref={userRef}
            type="button"
            aria-label="نمایش پروفایل مدیر"
            aria-haspopup="dialog"
            aria-expanded={openMenu === "user"}
            onClick={() => setOpenMenu((current) => current === "user" ? null : "user")}
            className="flex min-w-0 cursor-pointer items-center gap-1.5 border border-transparent bg-transparent py-1 ps-1.5 text-start hover:bg-[var(--bp-sidebar-hover)]"
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--bp-accent-100)] text-[11px] font-bold text-[var(--bp-accent-800)]">{fullName.slice(0, 1)}</span>
            <strong className="hidden max-w-28 truncate text-[12px] font-bold sm:block">{fullName}</strong>
          </button>
        </div>

        <BpPopover open={openMenu === "bell"} anchorRef={bellRef} onClose={closeMenu} label="اعلان‌ها" width={300}>
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--bp-divider)] pb-3">
            <strong className="text-sm">اعلان‌ها</strong>
            <BpTag>{notificationCount.toLocaleString("fa-IR")} مورد</BpTag>
          </div>
          {notificationCount > 0 ? (
            <>
              <p className="bp-muted m-0 text-[12px] leading-6">
                {notificationCount.toLocaleString("fa-IR")} سفارش برای بررسی یا آماده‌سازی در انتظار مدیر است.
              </p>
              <Link href="/admin/orders" onClick={closeMenu} className="mt-3 block border-t border-[var(--bp-divider)] pt-3 text-center text-xs font-bold text-[var(--bp-accent)]">
                مشاهده سفارش‌ها
              </Link>
            </>
          ) : <p className="bp-muted m-0 py-4 text-center text-xs">اعلان جدیدی ندارید.</p>}
        </BpPopover>

        <BpPopover open={openMenu === "user"} anchorRef={userRef} onClose={closeMenu} label="پروفایل مدیر" width={280}>
          <div className="flex items-center gap-3 border-b border-[var(--bp-divider)] pb-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><UserRound size={19} /></span>
            <div className="min-w-0">
              <strong className="block truncate text-sm">{fullName}</strong>
              <span dir="ltr" className="bp-muted mt-0.5 block truncate text-right text-[11px]">{user.email ?? "—"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="bp-muted text-[11px]">سطح دسترسی</span>
            <BpTag tone="accent">{userRoleLabels[user.role]}</BpTag>
          </div>
          <BpButton variant="danger" fullWidth isPending={loggingOut} onClick={() => void logout()} className="justify-center gap-2">
            {!loggingOut && <LogOut size={15} />}خروج از حساب
          </BpButton>
        </BpPopover>
      </header>

      <div className="flex min-h-0 flex-1">
        <BlueprintSidebar
          role={user.role}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          initialCollapsed={sidebarCollapsed}
        />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
          <AdminTemplateProvider template="BLUEPRINT">{children}</AdminTemplateProvider>
        </main>
      </div>
    </div>
  );
}
