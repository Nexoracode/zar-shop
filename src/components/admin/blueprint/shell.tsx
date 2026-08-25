"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { formatDateTime, formatMoney } from "@/lib/format";
import { userRoleLabels } from "@/modules/admin/labels";
import { getResolvedAdminTheme, setAdminThemePreference, subscribeToAdminTheme } from "@/lib/admin-theme";
import { AdminTemplateProvider } from "@/components/admin/template-context";
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
  const bellRef = useRef<HTMLButtonElement>(null);
  const userRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const theme = useSyncExternalStore(subscribeToAdminTheme, getResolvedAdminTheme, () => "light");
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
    <main dir="rtl" className="bp-root flex min-h-dvh">
      <BlueprintSidebar
        role={user.role}
        fullName={fullName}
        isLoggingOut={loggingOut}
        onLogout={() => void logout()}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        initialCollapsed={sidebarCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--bp-divider)] bg-[var(--bp-bg)] px-4 py-3 sm:px-7">
          {/* First child, so in RTL this cluster sits on the right: admin, then bell, then theme. */}
          <div className="flex items-center gap-4">
            <button
              ref={userRef}
              type="button"
              aria-label="نمایش پروفایل مدیر"
              aria-haspopup="dialog"
              aria-expanded={openMenu === "user"}
              onClick={() => setOpenMenu((current) => current === "user" ? null : "user")}
              className="flex cursor-pointer items-center gap-2.5 border border-transparent bg-transparent px-1.5 py-1 text-start text-[var(--bp-text)] hover:bg-[var(--bp-hover)]"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--bp-accent-100)] text-[13px] font-bold text-[var(--bp-accent-800)]">{fullName.slice(0, 1)}</span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <strong className="block max-w-36 truncate text-[13px] font-bold">{fullName}</strong>
                <span className="bp-muted block text-[11px]">{userRoleLabels[user.role]}</span>
              </span>
            </button>

            <BpButton ref={bellRef} isIconOnly aria-label="نمایش اعلان‌ها" aria-haspopup="dialog" aria-expanded={openMenu === "bell"} onClick={() => setOpenMenu((current) => current === "bell" ? null : "bell")} className="relative">
              <Bell size={17} />
              {notificationCount > 0 && (
                <span className="absolute -top-2 left-[-6px] flex h-4 min-w-4 items-center justify-center border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] px-1 text-[10px] font-bold text-[var(--bp-danger)]">
                  {notificationCount.toLocaleString("fa-IR")}
                </span>
              )}
            </BpButton>

            <BpButton
              isIconOnly
              aria-label={theme === "dark" ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"}
              onClick={() => setAdminThemePreference(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </BpButton>
          </div>

          <div className="flex items-center gap-4">
            {showGoldPrice && (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center border border-[var(--bp-divider)] text-sm font-bold text-[var(--bp-accent-700)]">۱۸</span>
                <div className="min-w-0 leading-tight">
                  <span className="bp-muted block text-[10px]">نرخ هر گرم طلای ۱۸ عیار</span>
                  <strong className="block truncate text-[13px] font-bold sm:text-sm">{goldPrice ? formatMoney(goldPrice) : "نرخ فعلاً در دسترس نیست"}</strong>
                  {goldFetchedAt && <span className="bp-muted hidden text-[10px] sm:block">آخرین بروزرسانی: {formatDateTime(goldFetchedAt)}</span>}
                </div>
              </div>
            )}
            {/* Wrapped in a plain div: `.bp-btn` sets `display` from an unlayered stylesheet, so a
                `lg:hidden` on the button itself never wins and the menu stayed visible on desktop. */}
            <div className="lg:hidden">
              <BpButton isIconOnly aria-label="باز کردن منوی مدیریت" onClick={() => setMobileOpen(true)}>
                <Menu size={18} />
              </BpButton>
            </div>
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

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-7">
          <AdminTemplateProvider template="BLUEPRINT">{children}</AdminTemplateProvider>
        </div>
      </div>
    </main>
  );
}
