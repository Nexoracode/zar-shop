"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ChartNoAxesCombined, FolderTree, Images, LogOut, Menu, PackageCheck, Store, Users, X } from "lucide-react";
import { useState } from "react";
import { userRoleLabels } from "@/modules/admin/labels";

const navLinks = [
  { href: "/admin", label: "نمای کلی", icon: ChartNoAxesCombined },
  { href: "/admin/products", label: "محصولات", icon: Boxes },
  { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { href: "/admin/media", label: "گالری رسانه", icon: Images },
  { href: "/admin/orders", label: "سفارش‌ها", icon: PackageCheck },
  { href: "/admin/users", label: "کاربران", icon: Users },
];

type Props = { user: { firstName: string | null; lastName: string | null; email: string; role: "ADMIN" | "OPERATOR" } };

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مدیر فروشگاه";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navigation = (
    <nav className="grid gap-1.5">
      {navLinks.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition ${active ? "bg-white text-[#172b4d] shadow-sm" : "text-white/65 hover:bg-white/8 hover:text-white"}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[#b5904c]" />}</Link>;
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between rounded-2xl bg-[#172b4d] p-3 text-white lg:hidden"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b5904c] font-black">زر</span><div><strong className="block text-sm">پنل مدیریت</strong><span className="block text-[11px] text-white/55">{fullName}</span></div></div><Button type="button" onPress={() => setOpen(true)} aria-label="باز کردن منوی مدیریت" isIconOnly variant="ghost" className="h-10 w-10 min-w-10 rounded-xl bg-white/10 text-white"><Menu size={20} /></Button></div>
      {open && <div className="fixed inset-0 z-[120] bg-slate-950/55 lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><aside className="ml-auto flex h-full w-[min(84vw,310px)] flex-col bg-[#172b4d] p-4 text-white shadow-2xl"><div className="mb-5 flex items-center justify-between"><strong>منوی مدیریت</strong><Button type="button" onPress={() => setOpen(false)} aria-label="بستن منوی مدیریت" isIconOnly variant="ghost" className="h-10 w-10 min-w-10 rounded-xl bg-white/10 text-white"><X size={19} /></Button></div>{navigation}<div className="mt-auto grid gap-2 border-t border-white/10 pt-4"><Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70"><Store size={18} />مشاهده فروشگاه</Link><Button type="button" onPress={() => void logout()} variant="ghost" className="justify-start gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-200"><LogOut size={18} />خروج از حساب</Button></div></aside></div>}
      <aside className="hidden self-start overflow-hidden rounded-[24px] bg-[#172b4d] p-4 text-white shadow-[0_24px_70px_rgba(16,35,62,0.18)] lg:sticky lg:top-5 lg:flex lg:h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:flex-col">
        <div className="mb-5 flex items-center gap-3 border-b border-white/10 px-1 pb-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#b5904c] font-black shadow-lg">زر</span><div className="min-w-0"><strong className="block text-sm">مدیریت زر گالری</strong><small className="block truncate text-[11px] text-white/50">مرکز عملیات فروشگاه</small></div></div>
        {navigation}
        <div className="mt-auto border-t border-white/10 pt-4"><div className="mb-3 flex items-center gap-3 px-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-bold">{fullName.slice(0, 1)}</span><div className="min-w-0"><strong className="block truncate text-xs">{fullName}</strong><span className="block text-[10px] text-white/45">{userRoleLabels[user.role]}</span></div></div><div className="grid grid-cols-2 gap-2"><Link href="/" aria-label="مشاهده فروشگاه" className="grid min-h-10 place-items-center rounded-xl bg-white/8 text-white/65 hover:text-white"><Store size={17} /></Link><Button type="button" onPress={() => void logout()} aria-label="خروج از حساب" isIconOnly variant="ghost" className="min-h-10 w-full rounded-xl bg-white/8 text-rose-200 hover:bg-rose-500/15"><LogOut size={17} /></Button></div></div>
      </aside>
    </>
  );
}
