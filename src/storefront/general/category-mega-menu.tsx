"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@heroui/react";
import { ChevronDown, ChevronLeft, Menu, Package } from "lucide-react";
import { useRef, useState } from "react";

type MenuChild = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
};

type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  image: { url: string; alt: string | null; type: string } | null;
  children: MenuChild[];
};

export function GeneralCategoryMegaMenu({ categories }: { categories: MenuCategory[] }) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];

  return (
    <div
      ref={containerRef}
      className="group/mega flex h-full items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Button type="button" variant="ghost" onPress={() => setOpen(true)} className={`relative h-full min-h-0 overflow-visible rounded-none px-0 font-bold transition after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[var(--brand-primary)] after:content-[''] after:transition-transform after:duration-300 after:ease-out group-hover/mega:after:scale-x-100 group-focus-within/mega:after:scale-x-100 ${open ? "text-[var(--brand-primary)]" : "hover:text-[var(--brand-primary)]"}`}>
        <Menu size={19} />
        دسته‌بندی کالاها
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </Button>
      <div className={`absolute inset-x-0 top-full z-50 border-t border-slate-200 bg-white shadow-[0_18px_38px_rgba(24,35,55,.14)] transition duration-200 ${open ? "visible pointer-events-auto translate-y-0 opacity-100" : "invisible pointer-events-none translate-y-1 opacity-0"}`} dir="rtl" aria-hidden={!open}>
      {activeCategory ? (
        <div className="flex h-[min(620px,calc(100dvh-130px))] min-h-[360px] w-full overflow-hidden">
          <aside className="storefront-mega-scroll w-60 shrink-0 overflow-y-auto overscroll-contain border-l border-slate-200 bg-slate-50" aria-label="دسته‌های اصلی">
            {categories.map((category) => {
              const active = category.id === activeCategory.id;
              return (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  onMouseEnter={() => setActiveCategoryId(category.id)}
                  onFocus={() => setActiveCategoryId(category.id)}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-14 items-center gap-3 border-r-2 px-4 text-xs font-bold transition ${active ? "border-[var(--brand-primary)] bg-white text-[var(--brand-primary)]" : "border-transparent text-slate-700 hover:bg-white hover:text-[var(--brand-primary)]"}`}
                >
                  <span className={`relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg ${active ? "bg-[var(--brand-primary)]/10" : "bg-white"}`}>
                    {category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="32px" className="object-cover" /> : <Package size={17} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  <ChevronLeft size={14} className="shrink-0" />
                </Link>
              );
            })}
          </aside>

          <section key={activeCategory.id} className="storefront-mega-scroll min-w-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6" aria-label={`زیر‌دسته‌های ${activeCategory.name}`}>
            <Link href={`/products?category=${activeCategory.slug}`} onClick={() => setOpen(false)} className="mb-7 inline-flex items-center gap-1 text-xs font-black text-[var(--brand-primary)]">
              همه محصولات {activeCategory.name}
              <ChevronLeft size={14} />
            </Link>

            {activeCategory.children.length ? (
              <div className="columns-2 gap-x-10 xl:columns-4">
                {activeCategory.children.map((child) => (
                  <section key={child.id} className="mb-8 inline-block w-full break-inside-avoid">
                    <Link href={`/products?category=${child.slug}`} onClick={() => setOpen(false)} className="mb-4 flex items-center gap-2 text-[0.8rem] font-black text-slate-800 transition hover:text-[var(--brand-primary)]">
                      <span className="h-4 w-0.5 shrink-0 bg-[var(--brand-primary)]" />
                      <span className="truncate">{child.name}</span>
                      <ChevronLeft size={13} className="shrink-0" />
                    </Link>
                    {child.children.length > 0 && (
                      <div className="grid gap-3 pr-2 text-xs text-slate-400">
                        {child.children.map((grandchild) => (
                          <Link key={grandchild.id} href={`/products?category=${grandchild.slug}`} onClick={() => setOpen(false)} className="truncate transition hover:text-[var(--brand-primary)] hover:pr-1">{grandchild.name}</Link>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid h-52 place-items-center border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                <span>برای این دسته هنوز زیر‌دسته‌ای ثبت نشده است.</span>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-xs text-slate-500">دسته‌بندی فعالی برای نمایش در منوی فروشگاه انتخاب نشده است.</div>
      )}
      </div>
    </div>
  );
}
