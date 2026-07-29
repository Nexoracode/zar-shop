"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Popover } from "@heroui/react";
import { Bell, ChevronDown, LogOut, Moon, ShoppingBag, Sun, UserRound } from "lucide-react";
import { formatDateTime, formatMoney } from "@/lib/format";
import { userRoleLabels } from "@/modules/admin/labels";
import type { UserRole } from "@generated/prisma/enums";

type AdminUser = { firstName: string | null; lastName: string | null; email: string; role: UserRole };

type Props = {
  user: AdminUser;
  goldPrice: string | null;
  goldFetchedAt: string | null;
  notificationCount: number;
  sidebar: ReactNode;
  children: ReactNode;
};

const themeStorageKey = "zar-admin-theme";
const themeChangeEvent = "zar-admin-theme-change";

function getThemeSnapshot() {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
  };
}

function setAdminTheme(dark: boolean) {
  window.localStorage.setItem(themeStorageKey, dark ? "dark" : "light");
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function AdminShell({ user, goldPrice, goldFetchedAt, notificationCount, sidebar, children }: Props) {
  const router = useRouter();
  const dark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مدیر فروشگاه";

  useEffect(() => {
    const theme = dark ? "zar-dark" : "zar";
    document.documentElement.dataset.theme = theme;
  }, [dark]);

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
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--warning)]/15 text-[var(--warning)]"><span className="text-base font-black">۱۸</span></span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[var(--muted)]">نرخ هر گرم طلای ۱۸ عیار</span>
                <strong className="block truncate text-sm font-black text-[var(--foreground)] sm:text-base">{goldPrice ? formatMoney(goldPrice) : "نرخ فعلاً در دسترس نیست"}</strong>
                {goldFetchedAt && <span className="hidden text-[9px] text-[var(--muted)] sm:block">آخرین بروزرسانی: {formatDateTime(goldFetchedAt)}</span>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button type="button" isIconOnly variant="ghost" aria-label={dark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"} onPress={() => setAdminTheme(!dark)} className="h-10 min-h-10 w-10 min-w-10 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              <Popover>
                <Popover.Trigger aria-label="نمایش اعلان‌ها" className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] outline-none transition hover:bg-[var(--surface-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                  <Bell size={18} />
                  {notificationCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-black text-[var(--danger-foreground)]">{notificationCount.toLocaleString("fa-IR")}</span>}
                </Popover.Trigger>
                <Popover.Content placement="bottom left" className="w-[min(90vw,320px)]">
                  <Popover.Dialog className="p-1">
                    <Popover.Heading className="mb-3 text-sm font-black">اعلان‌ها</Popover.Heading>
                    {notificationCount > 0 ? <div className="grid gap-3"><div className="flex gap-3 rounded-xl bg-[var(--surface-secondary)] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]"><ShoppingBag size={17} /></span><div><strong className="block text-xs">سفارش‌های نیازمند اقدام</strong><span className="text-[11px] text-[var(--muted)]">{notificationCount.toLocaleString("fa-IR")} سفارش پرداخت‌شده یا در حال آماده‌سازی است.</span></div></div><Link href="/admin/orders" className="text-center text-xs font-bold text-[var(--link)]">مشاهده سفارش‌ها</Link></div> : <p className="m-0 py-4 text-center text-xs text-[var(--muted)]">اعلان جدیدی ندارید.</p>}
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>

              <Popover>
                <Popover.Trigger aria-label="نمایش پروفایل مدیر" className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-2 outline-none transition hover:bg-[var(--surface-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] sm:pl-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] text-[11px] font-black text-[var(--accent-foreground)]">{fullName.slice(0, 1)}</span>
                  <span className="hidden max-w-32 truncate text-xs font-bold sm:block">{fullName}</span>
                  <ChevronDown className="hidden text-[var(--muted)] sm:block" size={13} />
                </Popover.Trigger>
                <Popover.Content placement="bottom left" className="w-[min(90vw,300px)]">
                  <Popover.Dialog className="p-1">
                    <div className="mb-3 flex items-center gap-3 border-b border-[var(--border)] pb-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><UserRound size={20} /></span><div className="min-w-0"><strong className="block truncate text-sm">{fullName}</strong><span className="block truncate text-[11px] text-[var(--muted)]">{user.email}</span></div></div>
                    <Chip size="sm" variant="soft" className="mb-3"><Chip.Label>{userRoleLabels[user.role]}</Chip.Label></Chip>
                    <Button type="button" variant="danger-soft" fullWidth onPress={() => void logout()} className="justify-start gap-2"><LogOut size={15} />خروج از حساب</Button>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>
            </div>
          </header>
          <section className="min-w-0 rounded-[24px]">{children}</section>
        </div>
      </div>
    </main>
  );
}
