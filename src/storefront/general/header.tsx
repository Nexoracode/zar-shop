import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronLeft, Headphones, Home, LayoutDashboard, Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import type { User } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";

type Props = { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuCategoryIds: string[] };

export async function GeneralHeader({ settings, brand, user, menuCategoryIds }: Props) {
  const categories = await db.category.findMany({
    where: { id: { in: menuCategoryIds }, isActive: true, parentId: null },
    include: {
      children: {
        where: { isActive: true },
        include: { children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const accountHref = user ? (user.isGuest ? "/cart" : "/account") : "/login";
  const logo = brand.mainLogoMedia
    ? <span className="relative block h-10 w-28"><Image src={brand.mainLogoMedia.url} alt={brand.mainLogoMedia.alt ?? settings.storeName} fill sizes="112px" className="object-contain" /></span>
    : <strong className="text-base font-black text-[var(--brand-primary)]">{settings.storeName}</strong>;

  return <>
    <header className={`relative z-50 border-b border-[#e7e9ed] bg-white shadow-[0_2px_10px_rgba(0,0,0,.035)] ${brand.stickyStoreHeader ? "sticky top-0" : ""}`}>
      <div className="hidden h-9 items-center justify-between bg-[#f7f8fa] px-10 text-[0.7rem] text-[#666d79] lg:flex">
        <span>{settings.tagline}</span>
        <nav className="flex items-center gap-6" aria-label="دسترسی‌های اطلاعاتی"><Link href="/pages/about">درباره ما</Link><Link href="/pages/contact">تماس با ما</Link><Link href="/#faq">سوالات متداول</Link></nav>
      </div>
      <div className="relative flex h-14 items-center justify-center px-4 lg:hidden">
        <Link href="/products" className="absolute right-4" aria-label="منوی محصولات"><Menu size={23} /></Link>
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <Link href="/products" className="absolute left-4" aria-label="جستجوی محصولات"><Search size={22} /></Link>
      </div>
      <div className="hidden h-16 items-center px-10 lg:flex">
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <nav className="mr-12 flex h-full items-center gap-8 text-sm" aria-label="دسته‌بندی محصولات">
          <div className="group flex h-full items-center">
            <Link href="/products" className="flex h-full items-center gap-2 border-b-2 border-transparent font-bold transition group-hover:border-[var(--brand-primary)] group-hover:text-[var(--brand-primary)] group-focus-within:border-[var(--brand-primary)] group-focus-within:text-[var(--brand-primary)]">
              <Menu size={19} />
              دسته‌بندی کالاها
              <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
            </Link>
            <div className="invisible pointer-events-none absolute inset-x-10 top-full z-50 translate-y-1 border-t border-[#e7e9ed] bg-white opacity-0 shadow-[0_18px_38px_rgba(24,35,55,.12)] transition duration-200 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100" dir="rtl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
                <strong className="text-xs text-slate-700">دسته‌بندی کالاها</strong>
                <Link href="/products" className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)]">مشاهده همه کالاها<ChevronLeft size={13} /></Link>
              </div>
              {categories.length ? (
                <div className="grid max-h-[420px] grid-cols-2 gap-x-10 gap-y-8 overflow-y-auto px-6 py-6 md:grid-cols-3 xl:grid-cols-5">
                  {categories.map((category) => (
                    <section key={category.id} className="min-w-0">
                      <Link href={`/products?category=${category.slug}`} className="mb-4 flex items-center gap-2 text-[0.78rem] font-black text-slate-800 transition hover:text-[var(--brand-primary)]">
                        <span className="h-4 w-1 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                        <span className="truncate">{category.name}</span>
                        <ChevronLeft className="mr-auto shrink-0" size={14} />
                      </Link>
                      <div className="grid gap-3 border-r border-slate-100 pr-3 text-xs text-slate-500">
                        {category.children.length ? category.children.map((child) => (
                          <div key={child.id} className="grid gap-2">
                            <Link href={`/products?category=${child.slug}`} className="font-bold text-slate-600 transition hover:text-[var(--brand-primary)]">{child.name}</Link>
                            {child.children.length > 0 && (
                              <div className="grid gap-2 pr-2 text-[11px] text-slate-400">
                                {child.children.map((grandchild) => <Link key={grandchild.id} href={`/products?category=${grandchild.slug}`} className="truncate transition hover:text-[var(--brand-primary)]">{grandchild.name}</Link>)}
                              </div>
                            )}
                          </div>
                        )) : <Link href={`/products?category=${category.slug}`} className="transition hover:text-[var(--brand-primary)]">مشاهده محصولات این دسته</Link>}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-10 text-center text-xs text-slate-500">دسته‌بندی فعالی برای نمایش در منوی فروشگاه انتخاب نشده است.</div>
              )}
            </div>
          </div>
          {categories.map((category) => <Link key={category.id} href={`/products?category=${category.slug}`} className="flex h-full items-center border-b-2 border-transparent transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">{category.name}</Link>)}
        </nav>
        <div className="mr-auto flex items-center gap-5 text-[#555]">
          <Link href="/products" aria-label="جستجوی محصولات"><Search size={21} /></Link>
          <Link href={accountHref} aria-label="حساب کاربری"><UserRound size={21} /></Link>
          <Link href="/cart" aria-label="سبد خرید"><ShoppingCart size={21} /></Link>
          {user?.role !== "CUSTOMER" && user && <Link href="/admin" aria-label="پنل مدیریت"><LayoutDashboard size={20} /></Link>}
        </div>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[66px] grid-cols-4 border-t border-[#e7e9ed] bg-white/95 text-[#6f7480] shadow-[0_-5px_20px_rgba(0,0,0,.05)] backdrop-blur lg:hidden" aria-label="ناوبری موبایل">
      <Link href="/" className="grid place-items-center content-center text-[var(--brand-primary)]"><Home size={21} /><small className="sr-only">خانه</small></Link>
      <Link href="/cart" className="grid place-items-center content-center"><ShoppingCart size={21} /><small className="sr-only">سبد خرید</small></Link>
      {settings.supportPhone ? <a href={`tel:${normalizeNumericValue(settings.supportPhone, false)}`} className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></a> : <Link href="/pages/contact" className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></Link>}
      <Link href={accountHref} className="grid place-items-center content-center"><UserRound size={21} /><small className="sr-only">حساب کاربری</small></Link>
    </nav>
  </>;
}
