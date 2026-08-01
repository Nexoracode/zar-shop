"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Popover } from "@heroui/react";
import { Bell, LogOut, Moon, ShoppingBag, Sun, UserRound } from "lucide-react";
import { formatDateTime, formatMoney } from "@/lib/format";
import { userRoleLabels } from "@/modules/admin/labels";
import type { UserRole } from "@generated/prisma/enums";
import { getResolvedAdminTheme, setAdminThemePreference, subscribeToAdminTheme } from "@/lib/admin-theme";

type AdminUser = { firstName: string | null; lastName: string | null; email: string; role: UserRole };

type Props = {
  user: AdminUser;
  goldPrice: string | null;
  goldFetchedAt: string | null;
  notificationCount: number;
  sidebar: ReactNode;
  children: ReactNode;
};

export function AdminShell({ user, goldPrice, goldFetchedAt, notificationCount, sidebar, children }: Props) {
  const router = useRouter();
  const theme = useSyncExternalStore(subscribeToAdminTheme, getResolvedAdminTheme, () => "light");
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مدیر فروشگاه";

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "zar-dark" : "zar";
  }, [theme]);

  useEffect(() => {
    return () => {
      document.documentElement.dataset.theme = "zar";
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="admin-shell min-h-dvh bg-[var(--background)] py-4 text-[var(--foreground)] transition-colors sm:py-5">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-4 px-4 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        {sidebar}
        <div className="admin-content min-w-0">
          <header className="admin-topbar sticky top-3 z-40 mb-6 flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2.5 shadow-sm backdrop-blur-xl sm:px-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Popover>
                <Popover.Trigger aria-label="نمایش پروفایل مدیر" className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] p-0 outline-none transition hover:bg-[var(--surface-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-black text-[var(--accent-foreground)]">{fullName.slice(0, 1)}</span>
                  <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-emerald-500" aria-label="آنلاین" />
                </Popover.Trigger>
                <Popover.Content dir="rtl" placement="bottom right" className="w-[min(90vw,300px)] rounded-[5px] border border-[var(--border)] bg-[var(--overlay)] p-0 text-right text-[var(--overlay-foreground)] shadow-xl">
                  <Popover.Dialog dir="rtl" className="p-0 text-right">
                    <div className="p-4">
                      <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"><UserRound size={20} /></span>
                        <div className="min-w-0"><strong className="block truncate text-sm">{fullName}</strong><span dir="ltr" className="mt-0.5 block truncate text-right text-[11px] text-[var(--muted)]">{user.email}</span></div>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-4"><span className="text-[11px] text-[var(--muted)]">سطح دسترسی</span><Chip size="sm" variant="soft"><Chip.Label>{userRoleLabels[user.role]}</Chip.Label></Chip></div>
                      <Button type="button" variant="danger-soft" fullWidth onPress={() => void logout()} className="justify-start gap-2 rounded-[5px]"><LogOut size={15} />خروج از حساب</Button>
                    </div>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>

              <Popover>
                <Popover.Trigger aria-label="نمایش اعلان‌ها" className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] outline-none transition hover:bg-[var(--surface-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                  <Bell size={18} />
                  {notificationCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-black text-[var(--danger-foreground)]">{notificationCount.toLocaleString("fa-IR")}</span>}
                </Popover.Trigger>
                <Popover.Content dir="rtl" placement="bottom right" className="w-[min(90vw,320px)] rounded-[5px] border border-[var(--border)] bg-[var(--overlay)] p-0 text-right text-[var(--overlay-foreground)] shadow-xl">
                  <Popover.Dialog dir="rtl" className="p-0 text-right">
                    <div className="p-4">
                      <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                        <Popover.Heading className="m-0 text-sm font-black">اعلان‌ها</Popover.Heading>
                        <Chip size="sm" variant="soft"><Chip.Label>{notificationCount.toLocaleString("fa-IR")} مورد</Chip.Label></Chip>
                      </div>
                      {notificationCount > 0 ? (
                        <div className="grid gap-3">
                          <div className="flex items-start gap-3 rounded-[5px] bg-[var(--surface-secondary)] p-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] bg-[var(--accent)]/10 text-[var(--accent)]"><ShoppingBag size={17} /></span>
                            <div className="min-w-0 pt-0.5"><strong className="block text-xs">سفارش‌های نیازمند اقدام</strong><span className="mt-1 block text-[11px] leading-5 text-[var(--muted)]">{notificationCount.toLocaleString("fa-IR")} سفارش برای بررسی یا آماده‌سازی در انتظار مدیر است.</span></div>
                          </div>
                          <Link href="/admin/orders" className="block border-t border-[var(--border)] pt-3 text-center text-xs font-bold text-[var(--link)]">مشاهده سفارش‌ها</Link>
                        </div>
                      ) : <p className="m-0 py-5 text-center text-xs text-[var(--muted)]">اعلان جدیدی ندارید.</p>}
                    </div>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>

              <Button type="button" isIconOnly variant="ghost" aria-label={theme === "dark" ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"} onPress={() => setAdminThemePreference(theme === "dark" ? "light" : "dark")} className="h-10 min-h-10 w-10 min-w-10 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

            </div>

            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[3px] bg-[var(--warning)]/15 text-[var(--warning)]"><span className="text-base font-black">۱۸</span></span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[var(--muted)]">نرخ هر گرم طلای ۱۸ عیار</span>
                <strong className="block truncate text-sm font-black text-[var(--foreground)] sm:text-base">{goldPrice ? formatMoney(goldPrice) : "نرخ فعلاً در دسترس نیست"}</strong>
                {goldFetchedAt && <span className="hidden text-[9px] text-[var(--muted)] sm:block">آخرین بروزرسانی: {formatDateTime(goldFetchedAt)}</span>}
              </div>
            </div>
          </header>
          <section className="min-w-0 rounded-[24px]">{children}</section>
        </div>
      </div>
    </main>
  );
}
