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
import type { StoreIndustry, UserRole } from "@generated/prisma/enums";
import { canOpenSettingsSection } from "@/modules/auth/permissions";

type SettingsItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

// Cards link to a settings section; the section slug is what the permission map keys on.
const sectionOf = (href: string) => href.replace("/admin/settings/", "").split("/")[0] ?? "";

export function BlueprintAdminSettingsNavigation({ industry, role }: { industry: StoreIndustry; role: UserRole }) {
  const allGroups: Array<{ id: string; title: string; description: string; items: SettingsItem[] }> = [
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

  const groups = allGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canOpenSettingsSection(role, sectionOf(item.href))) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`settings-${group.id}`} className="grid gap-2.5">
          <div>
            <h2 id={`settings-${group.id}`} className="m-0 text-[13px] font-bold">{group.title}</h2>
            <p className="bp-muted m-0 mt-1 text-[12px]">{group.description}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className="bp-frame group relative flex items-center gap-3 p-[14px] transition hover:border-[var(--bp-accent)]">
                <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><Icon size={17} /></span>
                <div className="min-w-0 flex-1"><strong className="block text-[13px]">{title}</strong><span className="bp-muted mt-0.5 block truncate text-[11px]">{description}</span></div>
                <ChevronLeft size={16} className="bp-muted shrink-0 transition group-hover:-translate-x-0.5 group-hover:text-[var(--bp-accent)]" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
