"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { formatDateTime, formatMoney } from "@/lib/format";
import { userRoleLabels } from "@/modules/admin/labels";
import { getResolvedAdminTheme, setAdminThemePreference, subscribeToAdminTheme } from "@/lib/admin-theme";
import { AdminTemplateProvider } from "@/components/admin/template-context";
import { BlueprintSidebar } from "./sidebar";
import { BpButton } from "./ui/button";
import { BpTag } from "./ui/tag";

type AdminUser = { firstName: string | null; lastName: string | null; email: string | null; role: UserRole };

type Props = {
  user: AdminUser;
  showGoldPrice: boolean;
  goldPrice: string | null;
  goldFetchedAt: string | null;
  notificationCount: number;
  children: ReactNode;
};

export function BlueprintShell({ user, showGoldPrice, goldPrice, goldFetchedAt, notificationCount, children }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"user" | "bell" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(subscribeToAdminTheme, getResolvedAdminTheme, () => "light");
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مدیر فروشگاه";

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "zar-dark" : "zar";
  }, [theme]);

  useEffect(() => () => { document.documentElement.dataset.theme = "zar"; }, []);

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenu(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

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
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--bp-divider)] bg-[var(--bp-bg)] px-4 py-3 sm:px-7">
          <div className="flex items-center gap-2">
            <BpButton isIconOnly aria-label="باز کردن منوی مدیریت" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={18} />
            </BpButton>
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
          </div>

          <div ref={menuRef} className="flex items-center gap-2">
            <BpButton
              isIconOnly
              aria-label={theme === "dark" ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"}
              onClick={() => setAdminThemePreference(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </BpButton>

            <div className="relative">
              <BpButton isIconOnly aria-label="نمایش اعلان‌ها" aria-expanded={openMenu === "bell"} onClick={() => setOpenMenu((current) => current === "bell" ? null : "bell")}>
                <Bell size={17} />
                {notificationCount > 0 && (
                  <span className="absolute -top-2 left-[-6px] flex h-4 min-w-4 items-center justify-center border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] px-1 text-[10px] font-bold text-[var(--bp-danger)]">
                    {notificationCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </BpButton>
              {openMenu === "bell" && (
                <div dir="rtl" className="bp-frame absolute end-0 top-[calc(100%+8px)] z-50 w-[min(88vw,300px)] bg-[var(--bp-bg)] p-4 shadow-[var(--bp-shadow-lg)]">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--bp-divider)] pb-3">
                    <strong className="text-sm">اعلان‌ها</strong>
                    <BpTag>{notificationCount.toLocaleString("fa-IR")} مورد</BpTag>
                  </div>
                  {notificationCount > 0 ? (
                    <>
                      <p className="bp-muted m-0 text-[12px] leading-6">
                        {notificationCount.toLocaleString("fa-IR")} سفارش برای بررسی یا آماده‌سازی در انتظار مدیر است.
                      </p>
                      <Link href="/admin/orders" onClick={() => setOpenMenu(null)} className="mt-3 block border-t border-[var(--bp-divider)] pt-3 text-center text-xs font-bold text-[var(--bp-accent)]">
                        مشاهده سفارش‌ها
                      </Link>
                    </>
                  ) : <p className="bp-muted m-0 py-4 text-center text-xs">اعلان جدیدی ندارید.</p>}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="نمایش پروفایل مدیر"
                aria-expanded={openMenu === "user"}
                onClick={() => setOpenMenu((current) => current === "user" ? null : "user")}
                className="flex cursor-pointer items-center gap-2 border border-transparent bg-transparent px-1 py-1 text-[13px] text-[var(--bp-text)] hover:bg-[var(--bp-hover)]"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--bp-accent-100)] text-[13px] font-bold text-[var(--bp-accent-800)]">{fullName.slice(0, 1)}</span>
                <span className="hidden max-w-32 truncate sm:block">{fullName}</span>
              </button>
              {openMenu === "user" && (
                <div dir="rtl" className="bp-frame absolute end-0 top-[calc(100%+8px)] z-50 w-[min(88vw,280px)] bg-[var(--bp-bg)] p-4 shadow-[var(--bp-shadow-lg)]">
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
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-7">
          <AdminTemplateProvider template="BLUEPRINT">{children}</AdminTemplateProvider>
        </div>
      </div>
    </main>
  );
}
