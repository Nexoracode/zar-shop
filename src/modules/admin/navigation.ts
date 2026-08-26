import type { LucideIcon } from "lucide-react";
import { BadgePercent, Boxes, ChartNoAxesCombined, FolderTree, Images, ListChecks, ListTree, Mail, MessageSquareText, PackageCheck, Palette, ScrollText, Settings, SlidersHorizontal, Truck, Users } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { canOpenAnySettingsSection, hasPermission, type AdminPermission } from "@/modules/auth/permissions";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon; permission?: AdminPermission };
export type AdminNavGroup = { title: string; icon: LucideIcon; items: AdminNavItem[] };

/**
 * Single source of truth for the admin menu. Both admin templates (classic sidebar and the
 * blueprint sidebar) read this list so the two skins can never drift apart.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    title: "داشبورد",
    icon: ChartNoAxesCombined,
    items: [{ href: "/admin", label: "نمای کلی", icon: ChartNoAxesCombined, permission: "dashboard:view" }],
  },
  {
    title: "کاتالوگ و محصولات",
    icon: Boxes,
    items: [
      { href: "/admin/products", label: "محصولات", icon: Boxes, permission: "catalog:manage" },
      { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree, permission: "catalog:manage" },
      { href: "/admin/media", label: "گالری رسانه", icon: Images, permission: "catalog:manage" },
    ],
  },
  {
    title: "تنوع و ویژگی‌ها",
    icon: ListTree,
    items: [
      { href: "/admin/option-types", label: "انواع تنوع", icon: ListTree, permission: "catalog:manage" },
      { href: "/admin/product-attributes", label: "ویژگی‌های محصولات", icon: ListChecks, permission: "catalog:manage" },
      { href: "/admin/colors", label: "رنگ‌های تنوع", icon: Palette, permission: "catalog:manage" },
      { href: "/admin/category-attributes", label: "ویژگی‌های دسته‌بندی", icon: SlidersHorizontal, permission: "catalog:manage" },
    ],
  },
  {
    title: "فروش و مشتریان",
    icon: PackageCheck,
    items: [
      { href: "/admin/orders", label: "سفارش‌ها", icon: PackageCheck, permission: "orders:manage" },
      { href: "/admin/promotions", label: "پروموشن‌ها", icon: BadgePercent, permission: "orders:manage" },
      { href: "/admin/shipping-methods", label: "روش‌های ارسال", icon: Truck, permission: "orders:manage" },
      { href: "/admin/users", label: "کاربران", icon: Users, permission: "users:manage" },
      { href: "/admin/reviews", label: "دیدگاه‌ها و امتیازها", icon: MessageSquareText, permission: "catalog:manage" },
      { href: "/admin/contact-messages", label: "پیام‌های تماس", icon: Mail, permission: "orders:manage" },
    ],
  },
  {
    title: "تنظیمات سیستم",
    icon: Settings,
    items: [
      { href: "/admin/audit-logs", label: "تاریخچه فعالیت‌ها", icon: ScrollText, permission: "audit:view" },
      { href: "/admin/settings", label: "تنظیمات", icon: Settings },
    ],
  },
];

/**
 * Drops the entries a role may not open, then any group left empty. The settings hub has no
 * single permission of its own: it is visible when the role can open at least one section
 * inside it.
 */
export function visibleAdminNavGroups(role: UserRole): AdminNavGroup[] {
  return adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href === "/admin/settings"
        ? canOpenAnySettingsSection(role)
        : !item.permission || hasPermission(role, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}

export function isAdminNavItemActive(href: string, pathname: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}
