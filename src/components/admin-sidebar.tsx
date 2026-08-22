"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { BadgePercent, Boxes, ChartNoAxesCombined, FolderTree, Images, ListChecks, ListTree, LogOut, Menu, MessageSquareText, PackageCheck, Palette, ScrollText, Settings, SlidersHorizontal, Store, Users, X } from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@generated/prisma/enums";
import { canOpenAnySettingsSection, hasPermission, type AdminPermission } from "@/modules/auth/permissions";

type NavItem = { href: string; label: string; icon: typeof Boxes; permission?: AdminPermission };

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "داشبورد",
    items: [{ href: "/admin", label: "نمای کلی", icon: ChartNoAxesCombined, permission: "dashboard:view" }],
  },
  {
    title: "کاتالوگ و محصولات",
    items: [
      { href: "/admin/products", label: "محصولات", icon: Boxes, permission: "catalog:manage" },
      { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree, permission: "catalog:manage" },
      { href: "/admin/media", label: "گالری رسانه", icon: Images, permission: "catalog:manage" },
    ],
  },
  {
    title: "تنوع و ویژگی‌ها",
    items: [
      { href: "/admin/product-options", label: "تنوع محصولات", icon: ListTree, permission: "catalog:manage" },
      { href: "/admin/product-attributes", label: "ویژگی‌های محصولات", icon: ListChecks, permission: "catalog:manage" },
      { href: "/admin/colors", label: "رنگ‌های تنوع", icon: Palette, permission: "catalog:manage" },
      { href: "/admin/category-attributes", label: "ویژگی‌های دسته‌بندی", icon: SlidersHorizontal, permission: "catalog:manage" },
    ],
  },
  {
    title: "فروش و مشتریان",
    items: [
      { href: "/admin/orders", label: "سفارش‌ها", icon: PackageCheck, permission: "orders:manage" },
      { href: "/admin/promotions", label: "پروموشن‌ها", icon: BadgePercent, permission: "orders:manage" },
      { href: "/admin/users", label: "کاربران", icon: Users, permission: "users:manage" },
      { href: "/admin/reviews", label: "دیدگاه‌ها و امتیازها", icon: MessageSquareText, permission: "catalog:manage" },
    ],
  },
  {
    title: "تنظیمات سیستم",
    items: [
      { href: "/admin/audit-logs", label: "تاریخچه فعالیت‌ها", icon: ScrollText, permission: "audit:view" },
      { href: "/admin/settings", label: "تنظیمات", icon: Settings },
    ],
  },
];

type Props = { user: { firstName: string | null; lastName: string | null; email: string; role: UserRole } };

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مدیر فروشگاه";

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

  const visibleGroups = navGroups.map((group) => ({
    ...group,
    // The settings hub has no single permission: it is visible when the role can open
    // at least one section inside it.
    items: group.items.filter((item) => item.href === "/admin/settings"
      ? canOpenAnySettingsSection(user.role)
      : !item.permission || hasPermission(user.role, item.permission)),
  })).filter((group) => group.items.length > 0);

  const navigation = (
    <nav aria-label="منوی اصلی مدیریت" className="admin-sidebar-scroll grid min-h-0 flex-1 content-start overflow-y-auto pl-1">
      {visibleGroups.map((group, groupIndex) => (
        <section key={group.title} aria-labelledby={`admin-nav-${groupIndex}`} className={groupIndex ? "mt-3 border-t border-white/10 pt-3" : ""}>
          <h2 id={`admin-nav-${groupIndex}`} className="mb-1 px-3 text-[10px] font-bold text-[var(--accent-foreground)]/35">{group.title}</h2>
          <div className="grid gap-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex min-h-9 items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition ${active ? "bg-white/12 text-[var(--accent-foreground)] shadow-sm" : "text-[var(--accent-foreground)]/65 hover:bg-white/8 hover:text-[var(--accent-foreground)]"}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />}</Link>;
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between rounded-2xl bg-[var(--accent)] p-3 text-[var(--accent-foreground)] lg:hidden"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--warning)] font-bold">زر</span><div><strong className="block text-sm">پنل مدیریت</strong><span className="block text-[11px] text-[var(--accent-foreground)]/55">{fullName}</span></div></div><Button type="button" onPress={() => setOpen(true)} aria-label="باز کردن منوی مدیریت" isIconOnly variant="ghost" className="h-10 w-10 min-w-10 rounded-xl bg-white/10 text-[var(--accent-foreground)]"><Menu size={20} /></Button></div>
      {open && <div className="fixed inset-0 z-[120] bg-slate-950/55 lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><aside className="ml-auto flex h-full w-[min(84vw,310px)] flex-col bg-[var(--accent)] p-4 text-[var(--accent-foreground)] shadow-2xl"><div className="mb-5 flex items-center justify-between"><strong>منوی مدیریت</strong><Button type="button" onPress={() => setOpen(false)} aria-label="بستن منوی مدیریت" isIconOnly variant="ghost" className="h-10 w-10 min-w-10 rounded-xl bg-white/10 text-[var(--accent-foreground)]"><X size={19} /></Button></div>{navigation}<div className="mt-auto grid gap-2 border-t border-white/10 pt-4"><Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--accent-foreground)]/70"><Store size={18} />مشاهده فروشگاه</Link><Button type="button" isPending={loggingOut} onPress={() => void logout()} variant="ghost" className="justify-start gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-200"><LogOut size={18} />خروج از حساب</Button></div></aside></div>}
      <aside className="hidden self-start overflow-hidden rounded-[24px] bg-[var(--accent)] p-4 text-[var(--accent-foreground)] shadow-[0_24px_70px_rgba(16,35,62,0.18)] lg:sticky lg:top-5 lg:flex lg:h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:flex-col">
        <div className="mb-5 flex items-center gap-3 border-b border-white/10 px-1 pb-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--warning)] font-bold shadow-lg">زر</span><div className="min-w-0"><strong className="block text-sm">مدیریت زر گالری</strong><small className="block truncate text-[11px] text-[var(--accent-foreground)]/50">مرکز عملیات فروشگاه</small></div></div>
        {navigation}
      </aside>
    </>
  );
}
