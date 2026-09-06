import type { LucideIcon } from "lucide-react";
import {
  Bell, BellRing, Boxes, CreditCard, FileQuestion, LayoutDashboard, Images, ListTree, MessageSquarePlus,
  Megaphone, Palette, Plus, Search, Settings2, Store, Truck,
} from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { canOpenAnySettingsSection, canOpenSettingsSection, hasPermission, type AdminPermission } from "@/modules/auth/permissions";
import { adminNavGroups } from "@/modules/admin/navigation";

export type AdminSearchEntry = {
  id: string;
  title: string;
  description: string;
  href: string;
  group: string;
  icon: LucideIcon;
  /** Extra terms a reader might actually type, beyond the title itself. */
  keywords: string[];
  permission?: AdminPermission;
  /** Checked with `canOpenSettingsSection` instead of a plain permission. */
  settingsSection?: string;
  /** The `/admin/settings` hub itself: visible whenever any section under it is. */
  isSettingsHub?: boolean;
};

/** Per-href search keywords for the main nav items — the items themselves come from the single
 * shared nav list (`adminNavGroups`) so the two never drift on label, href or icon. */
const navKeywords: Record<string, string[]> = {
  "/admin": ["خانه", "آمار", "گزارش", "نمودار", "فروش امروز"],
  "/admin/products": ["کالا", "انبار", "موجودی", "قیمت", "کاتالوگ", "ویرایش محصول", "تغییر قیمت محصول"],
  "/admin/categories": ["دسته", "زیردسته", "طبقه‌بندی", "ویرایش دسته‌بندی"],
  "/admin/brands": ["برند", "سازنده", "کمپانی", "ویرایش برند"],
  "/admin/media": ["تصویر", "عکس", "ویدیو", "گالری"],
  "/admin/option-types": ["تنوع", "سایز", "عیار", "ویژگی محصول", "ویرایش نوع تنوع"],
  "/admin/product-attributes": ["ویژگی", "مشخصات فنی محصول"],
  "/admin/colors": ["رنگ", "پالت", "ویرایش رنگ"],
  "/admin/category-attributes": ["ویژگی دسته", "فیلتر دسته‌بندی"],
  "/admin/orders": ["فاکتور", "خرید", "سفارش مشتری", "پرداخت", "ویرایش سفارش", "تغییر وضعیت سفارش", "پیگیری مرسوله"],
  "/admin/promotions": ["تخفیف", "کد تخفیف", "کمپین", "جشنواره", "ویرایش پروموشن", "غیرفعال‌کردن تخفیف"],
  "/admin/shipping-methods": ["ارسال", "پست", "باربری", "هزینه ارسال", "نرخ ارسال", "ویرایش روش ارسال"],
  "/admin/users": ["مشتری", "حساب کاربری", "اکانت", "کاربر", "ویرایش کاربر", "تغییر نقش کاربر", "مسدودکردن کاربر"],
  "/admin/reviews": ["نظر", "امتیاز", "کامنت محصول", "تایید دیدگاه", "رد دیدگاه"],
  "/admin/contact-messages": ["تماس با ما", "پیام مشتری", "پاسخ پیام"],
  "/admin/tickets": ["پشتیبانی", "درخواست پشتیبانی", "گفتگو", "پاسخ تیکت"],
  "/admin/support-ticket-categories": ["موضوع تیکت", "دسته پشتیبانی", "ویرایش موضوع"],
  "/admin/audit-logs": ["لاگ", "فعالیت مدیران", "گزارش عملیات"],
};

/** Search terms someone would type for "create new" regardless of which verb the title itself
 * uses ("افزودن" vs "ثبت"), so any of them surfaces every create action at once. */
const addSynonyms = ["اضافه کردن", "افزودن", "ایجاد", "ثبت", "جدید"];

/** Direct links to every "create new X" action — a list page alone would bury these a click
 * deeper, and searching "افزودن" should surface all of them side by side. Points at the
 * dedicated /new route where one exists, or the list page itself where creation happens inline
 * (categories, brands, colors, option types, support ticket categories all add through their own
 * list per the small-bounded-list pattern, not a separate route). */
const createEntries: AdminSearchEntry[] = [
  { id: "create-product", title: "افزودن محصول جدید", description: "ثبت محصول تازه در کاتالوگ", href: "/admin/products/new", group: "کاتالوگ و محصولات", icon: Plus, keywords: [...addSynonyms, "محصول", "کالا"], permission: "catalog:manage" },
  { id: "create-category", title: "افزودن دسته‌بندی", description: "ثبت دسته یا زیردسته تازه", href: "/admin/categories", group: "کاتالوگ و محصولات", icon: Plus, keywords: [...addSynonyms, "دسته", "زیردسته"], permission: "catalog:manage" },
  { id: "create-brand", title: "افزودن برند", description: "ثبت برند تازه", href: "/admin/brands", group: "کاتالوگ و محصولات", icon: Plus, keywords: [...addSynonyms, "برند"], permission: "catalog:manage" },
  { id: "create-color", title: "افزودن رنگ", description: "ثبت رنگ تازه برای تنوع محصول", href: "/admin/colors", group: "تنوع و ویژگی‌ها", icon: Plus, keywords: [...addSynonyms, "رنگ"], permission: "catalog:manage" },
  { id: "create-option-type", title: "افزودن نوع تنوع", description: "ثبت نوع تنوع تازه", href: "/admin/option-types", group: "تنوع و ویژگی‌ها", icon: Plus, keywords: [...addSynonyms, "تنوع", "سایز", "عیار"], permission: "catalog:manage" },
  { id: "create-order", title: "ثبت سفارش دستی", description: "ایجاد سفارش تازه برای مشتری", href: "/admin/orders/new", group: "فروش و مشتریان", icon: Plus, keywords: [...addSynonyms, "سفارش", "فاکتور دستی"], permission: "orders:manage" },
  { id: "create-promotion", title: "افزودن پروموشن", description: "ثبت کد تخفیف یا کمپین تازه", href: "/admin/promotions/new", group: "فروش و مشتریان", icon: Plus, keywords: [...addSynonyms, "تخفیف", "کد تخفیف", "کمپین"], permission: "orders:manage" },
  { id: "create-shipping-method", title: "افزودن روش ارسال", description: "ثبت روش ارسال تازه", href: "/admin/shipping-methods/new", group: "فروش و مشتریان", icon: Plus, keywords: [...addSynonyms, "ارسال", "پست", "باربری"], permission: "orders:manage" },
  { id: "create-user", title: "افزودن کاربر", description: "ثبت حساب کاربری تازه", href: "/admin/users/new", group: "فروش و مشتریان", icon: Plus, keywords: [...addSynonyms, "کاربر", "حساب", "مدیر جدید"], permission: "users:manage" },
  { id: "create-support-ticket-category", title: "افزودن موضوع تیکت", description: "ثبت موضوع تازه برای تیکت‌های پشتیبانی", href: "/admin/support-ticket-categories", group: "پشتیبانی", icon: Plus, keywords: [...addSynonyms, "موضوع", "تیکت"], permission: "tickets:manage" },
  { id: "create-payment-gateway", title: "افزودن درگاه پرداخت", description: "ثبت شناسه درگاه پرداخت تازه", href: "/admin/settings/payment-gateways/new", group: "فروش و عملیات", icon: Plus, keywords: [...addSynonyms, "درگاه", "زرین‌پال", "زیبال"], settingsSection: "payment-gateways" },
  { id: "create-sms-provider", title: "افزودن ارائه‌دهنده پیامک", description: "ثبت پیکربندی ارائه‌دهنده پیامک تازه", href: "/admin/settings/notifications/providers/new", group: "محتوا و دیده‌شدن", icon: Plus, keywords: [...addSynonyms, "پیامک", "فراز", "ایران اس ام اس"], settingsSection: "notifications" },
  { id: "create-manual-sms", title: "ارسال پیامک جدید", description: "ارسال دستی پیامک به مخاطبان", href: "/admin/settings/notifications/manual/new", group: "محتوا و دیده‌شدن", icon: Plus, keywords: [...addSynonyms, "پیامک گروهی", "ارسال دستی"], settingsSection: "notifications" },
];

const navEntries: AdminSearchEntry[] = adminNavGroups.flatMap((group) =>
  group.items
    .filter((item) => item.href !== "/admin/settings")
    .map((item) => ({
      id: item.href,
      title: item.label,
      description: group.title,
      href: item.href,
      group: group.title,
      icon: item.icon,
      keywords: navKeywords[item.href] ?? [],
      permission: item.permission,
    })),
);

/** Every settings page, including the sub-pages a hub card alone would hide. */
const settingsEntries: AdminSearchEntry[] = [
  { id: "settings-hub", title: "تنظیمات", description: "همه بخش‌های تنظیمات فروشگاه", href: "/admin/settings", group: "تنظیمات سیستم", icon: Settings2, keywords: ["تنظیمات کلی"], isSettingsHub: true },
  { id: "settings-general", title: "تنظیمات عمومی", description: "اطلاعات فروشگاه، تماس و وضعیت فعالیت", href: "/admin/settings/general", group: "فروشگاه و ویترین", icon: Store, keywords: ["نام فروشگاه", "شماره تماس", "آدرس", "حالت تعمیر", "خاموش کردن فروشگاه"], settingsSection: "general" },
  { id: "settings-homepage", title: "صفحه اصلی", description: "اسلایدر، بنر و ترتیب بخش‌های صفحه", href: "/admin/settings/homepage", group: "فروشگاه و ویترین", icon: LayoutDashboard, keywords: ["هوم", "بنر", "اسلایدر"], settingsSection: "homepage" },
  { id: "settings-homepage-hero", title: "هیرو صفحه اصلی", description: "اسلایدها، تصاویر و لینک‌های هیرو", href: "/admin/settings/homepage/hero", group: "فروشگاه و ویترین", icon: Images, keywords: ["اسلاید", "بنر اصلی", "تصویر هیرو"], settingsSection: "homepage" },
  { id: "settings-homepage-tiles", title: "تایل‌های تصویری", description: "ردیف‌های تایل صفحه اصلی", href: "/admin/settings/homepage/tiles", group: "فروشگاه و ویترین", icon: LayoutDashboard, keywords: ["تایل", "کارت تصویری"], settingsSection: "homepage" },
  { id: "settings-homepage-layout", title: "چینش صفحه اصلی", description: "ترتیب و فعال‌سازی بخش‌های صفحه اصلی", href: "/admin/settings/homepage/layout", group: "فروشگاه و ویترین", icon: LayoutDashboard, keywords: ["ترتیب بخش‌ها", "چیدمان"], settingsSection: "homepage" },
  { id: "settings-homepage-promo", title: "پروموبنر بالای سایت", description: "نوار تبلیغاتی بالای صفحه", href: "/admin/settings/homepage/promo", group: "فروشگاه و ویترین", icon: Megaphone, keywords: ["نوار تبلیغاتی", "بنر بالای سایت"], settingsSection: "homepage" },
  { id: "settings-homepage-menu", title: "منوی بالای سایت", description: "آیتم‌های منوی هدر فروشگاه", href: "/admin/settings/homepage/menu", group: "فروشگاه و ویترین", icon: ListTree, keywords: ["منو", "هدر سایت", "ناوبری"], settingsSection: "homepage" },
  { id: "settings-branding", title: "ظاهر و برند", description: "رنگ‌ها، لوگوها و نمایش فروشگاه", href: "/admin/settings/branding", group: "فروشگاه و ویترین", icon: Palette, keywords: ["رنگ برند", "لوگو", "فاویکون", "رنگ اصلی", "رنگ فرعی"], settingsSection: "branding" },
  { id: "settings-orders", title: "سفارش و انقضا", description: "مهلت پرداخت و قواعد ثبت سفارش", href: "/admin/settings/orders", group: "فروش و عملیات", icon: Truck, keywords: ["انقضای سفارش", "مهلت پرداخت", "حداقل مبلغ سفارش", "شماره سفارش"], settingsSection: "orders" },
  { id: "settings-catalog", title: "محصولات و قیمت‌گذاری", description: "موجودی، نمایش کاتالوگ و نرخ قیمت‌گذاری", href: "/admin/settings/catalog", group: "فروش و عملیات", icon: Boxes, keywords: ["نرخ طلا", "قیمت طلا", "موجودی کم", "کاتالوگ"], settingsSection: "catalog" },
  { id: "settings-commerce", title: "ارسال و پرداخت", description: "روش‌های تحویل و درگاه پرداخت", href: "/admin/settings/commerce", group: "فروش و عملیات", icon: Truck, keywords: ["هزینه ارسال", "پرداخت آنلاین", "مبدأ ارسال", "وزن بسته"], settingsSection: "commerce" },
  { id: "settings-payment-gateways", title: "درگاه‌های پرداخت", description: "افزودن و مدیریت شناسه درگاه‌ها", href: "/admin/settings/payment-gateways", group: "فروش و عملیات", icon: CreditCard, keywords: ["زرین‌پال", "زیبال", "آسان پرداخت", "تومن", "درگاه بانکی"], settingsSection: "payment-gateways" },
  { id: "settings-content", title: "محتوا و سوالات متداول", description: "FAQ و صفحات راهنما و قوانین", href: "/admin/settings/content", group: "محتوا و دیده‌شدن", icon: FileQuestion, keywords: ["سوالات متداول", "قوانین", "حریم خصوصی", "درباره ما", "شرایط استفاده"], settingsSection: "content" },
  { id: "settings-seo", title: "SEO حرفه‌ای", description: "موتورهای جستجو و ساختار فنی صفحات", href: "/admin/settings/seo", group: "محتوا و دیده‌شدن", icon: Search, keywords: ["سئو", "متا", "گوگل", "ایندکس"], settingsSection: "seo" },
  { id: "settings-notifications", title: "پیامک و اعلان", description: "ارائه‌دهندگان، پیام‌های خودکار و ارسال‌های دستی", href: "/admin/settings/notifications", group: "محتوا و دیده‌شدن", icon: Bell, keywords: ["اس ام اس", "پیامک", "نوتیفیکیشن"], settingsSection: "notifications" },
  { id: "settings-notifications-preferences", title: "تنظیمات پیامک و اعلان", description: "کانال‌ها، رویدادها و متن پیام‌های خودکار", href: "/admin/settings/notifications/preferences", group: "محتوا و دیده‌شدن", icon: BellRing, keywords: ["متن پیامک", "قالب پیامک", "رویداد پیامک"], settingsSection: "notifications" },
  { id: "settings-notifications-providers", title: "ارائه‌دهندگان پیامک", description: "پیکربندی فراز اس‌ام‌اس و ایران اس‌ام‌اس", href: "/admin/settings/notifications/providers", group: "محتوا و دیده‌شدن", icon: Settings2, keywords: ["فراز پیامک", "ایران اس ام اس", "سرشماره"], settingsSection: "notifications" },
  { id: "settings-notifications-manual", title: "ارسال دستی پیامک", description: "انتخاب مخاطبان هدف و مشاهده تاریخچه ارسال", href: "/admin/settings/notifications/manual", group: "محتوا و دیده‌شدن", icon: MessageSquarePlus, keywords: ["پیامک گروهی", "ارسال پیامک تبلیغاتی"], settingsSection: "notifications" },
];

export const adminSearchIndex: AdminSearchEntry[] = [...navEntries, ...settingsEntries, ...createEntries];

export function isAdminSearchEntryVisible(entry: AdminSearchEntry, role: UserRole) {
  if (entry.isSettingsHub) return canOpenAnySettingsSection(role);
  if (entry.settingsSection) return canOpenSettingsSection(role, entry.settingsSection);
  if (entry.permission) return hasPermission(role, entry.permission);
  return true;
}

export function visibleAdminSearchIndex(role: UserRole): AdminSearchEntry[] {
  return adminSearchIndex.filter((entry) => isAdminSearchEntryVisible(entry, role));
}
