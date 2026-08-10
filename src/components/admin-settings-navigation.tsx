"use client";

import Link from "next/link";
import {
  Bell,
  Boxes,
  ChevronLeft,
  CreditCard,
  FileQuestion,
  LayoutDashboard,
  PackageCheck,
  Palette,
  Search,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@heroui/react";
import type { StoreIndustry } from "@generated/prisma/enums";

type SettingsItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function AdminSettingsNavigation({ industry }: { industry: StoreIndustry }) {
  const groups: Array<{ id: string; title: string; description: string; items: SettingsItem[] }> = [
    {
      id: "storefront",
      title: "فروشگاه و ویترین",
      description: "هویت، صفحه اصلی و ظاهر فروشگاه",
      items: [
        { href: "/admin/settings/general", title: "تنظیمات عمومی", description: "اطلاعات فروشگاه، تماس و وضعیت فعالیت", icon: Store },
        { href: "/admin/settings/homepage", title: "صفحه اصلی", description: "اسلایدر، بنر و ترتیب بخش‌های صفحه", icon: LayoutDashboard },
        { href: "/admin/settings/branding", title: "ظاهر و برند", description: "رنگ‌ها، لوگوها و نمایش فروشگاه", icon: Palette },
      ],
    },
    {
      id: "operations",
      title: "فروش و عملیات",
      description: "قواعد سفارش، محصولات، ارسال و پرداخت",
      items: [
        { href: "/admin/settings/orders", title: "سفارش و انقضا", description: "مهلت پرداخت و قواعد ثبت سفارش", icon: PackageCheck },
        { href: "/admin/settings/catalog", title: industry === "GOLD" ? "محصول و قیمت طلا" : "محصولات", description: industry === "GOLD" ? "موجودی، کاتالوگ و نرخ قیمت‌گذاری" : "موجودی و نمایش کاتالوگ محصولات", icon: Boxes },
        { href: "/admin/settings/commerce", title: "ارسال و پرداخت", description: "روش‌های تحویل و درگاه پرداخت", icon: Truck },
        { href: "/admin/settings/payment-gateways", title: "درگاه‌های پرداخت", description: "افزودن و مدیریت شناسه درگاه‌ها", icon: CreditCard },
      ],
    },
    {
      id: "content",
      title: "محتوا و دیده‌شدن",
      description: "محتوای راهنما، صفحات و ارتباط با مخاطب",
      items: [
        { href: "/admin/settings/content", title: "محتوا و سوالات متداول", description: "FAQ و صفحات راهنما و قوانین", icon: FileQuestion },
        { href: "/admin/settings/seo", title: "SEO حرفه‌ای", description: "موتورهای جستجو و ساختار فنی صفحات", icon: Search },
        { href: "/admin/settings/notifications", title: "اعلان و پیامک", description: "پیام‌های مدیریتی و اطلاع‌رسانی مشتریان", icon: Bell },
      ],
    },
  ];

  return <div className="grid gap-8" dir="rtl">
    {groups.map((group) => <section key={group.id} aria-labelledby={`settings-${group.id}`} className="grid gap-3">
      <div>
        <h2 id={`settings-${group.id}`} className="m-0 text-base font-black text-[var(--foreground)]">{group.title}</h2>
        <p className="mb-0 mt-1 text-xs text-[var(--muted)]">{group.description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.items.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]/20">
          <Card variant="secondary" className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--accent)]/45 group-hover:shadow-md sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><Icon size={20} /></span>
              <div className="min-w-0 flex-1"><strong className="block text-sm font-black text-[var(--foreground)]">{title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span></div>
              <ChevronLeft size={18} className="shrink-0 text-[var(--muted)] transition group-hover:-translate-x-1 group-hover:text-[var(--accent)]" />
            </div>
          </Card>
        </Link>)}
      </div>
    </section>)}
  </div>;
}
