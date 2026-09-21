import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, Dumbbell, HeartPulse, House, Laptop, Shirt, ShoppingBag, Smartphone } from "lucide-react";
import { BuilderPart } from "@/components/builder-part";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { isPartHidden, type PageDisplay } from "@/modules/page-builder/display-parts";

/** A category as the homepage's strip draws it. */
export type CategoryStripItem = { id: string; name: string; slug: string; imageUrl: string | null; imageAlt: string | null; _count: { products: number } };

/** The strip's items from database categories (only image files count as pictures). */
export function toCategoryStripItem(category: { id: string; name: string; slug: string; image: { type: string; url: string; alt: string | null } | null; _count: { products: number } }): CategoryStripItem {
  return { id: category.id, name: category.name, slug: category.slug, imageUrl: category.image?.type === "IMAGE" ? category.image.url : null, imageAlt: category.image?.alt ?? null, _count: category._count };
}

/** The look of the strip's card, next to the page's content-width classes. */
export const categoriesSectionClass = "rounded-2xl bg-white px-3 py-6 sm:px-6 lg:py-8";

const categoryTones = ["bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]", "bg-blue-50 text-blue-600", "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]", "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]", "bg-violet-50 text-violet-600", "bg-cyan-50 text-cyan-600"];

function resolveCategoryIcon(value: string): LucideIcon {
  const name = value.toLowerCase();
  if (name.includes("موبایل")) return Smartphone;
  if (name.includes("دیجیتال")) return Laptop;
  if (name.includes("خانه") || name.includes("آشپزخانه")) return House;
  if (name.includes("پوشاک") || name.includes("مد")) return Shirt;
  if (name.includes("ورزش") || name.includes("سفر")) return Dumbbell;
  if (name.includes("زیبایی") || name.includes("سلامت")) return HeartPulse;
  return ShoppingBag;
}

/**
 * The inside of the homepage's category strip: its title and description, a link to all products, and a scrolling row of
 * the categories. Used by the homepage itself and by the page builder's draft copy of the strip, so both look the same.
 * `descriptionHtml` has to be cleaned by the caller. Every switchable piece is a `BuilderPart` of the strip's section.
 */
export function CategoriesContent({ sectionId = "CATEGORIES", title, descriptionHtml, items, display, editable }: { /** The section the strip belongs to (its switches are stored under this id). */ sectionId?: string; title: string; descriptionHtml: string; items: CategoryStripItem[]; display: PageDisplay; editable: boolean }) {
  const part = (id: string) => ({ section: sectionId, id, hidden: isPartHidden(display, sectionId, id), editable });
  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <BuilderPart {...part("title")}><h2 className="m-0 text-lg font-bold text-[#232934] sm:text-xl">{title}</h2></BuilderPart>
          {descriptionHtml && <BuilderPart {...part("description")}><div className="mb-0 mt-1 text-xs leading-6 text-[#858b95] sm:text-sm [&_a]:underline [&_p]:m-0 [&_mark]:rounded-sm [&_mark]:px-0.5" dangerouslySetInnerHTML={{ __html: descriptionHtml }} /></BuilderPart>}
        </div>
        <BuilderPart {...part("more")}><Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">همه کالاها<ChevronLeft size={15} /></Link></BuilderPart>
      </div>
      <DragScrollRow ariaLabel="دسته‌بندی محصولات" showNavigation className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((category, index) => {
          const Icon = resolveCategoryIcon(`${category.name} ${category.slug}`);
          return (
            <Link key={category.id} href={`/products?category=${category.slug}`} className="group grid w-[84px] min-w-[84px] shrink-0 snap-start justify-items-center gap-2.5 text-center sm:w-[100px] sm:min-w-[100px] lg:w-[112px] lg:min-w-[112px]">
              <BuilderPart {...part("categoryImage")} className="contents">
                <span className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-full ${categoryTones[index % categoryTones.length]} transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}>
                  {category.imageUrl
                    ? <Image src={category.imageUrl} alt={category.imageAlt ?? category.name} fill sizes="112px" className="object-cover transition duration-500 group-hover:scale-105" />
                    : <><span className="absolute -left-4 -top-4 size-14 rounded-full bg-white/50" /><Icon size={38} strokeWidth={1.4} /></>}
                </span>
              </BuilderPart>
              <BuilderPart {...part("categoryTitle")}><span className="w-full truncate text-xs font-bold text-[#3d4450]">{category.name}</span></BuilderPart>
              <BuilderPart {...part("categoryCount")}><small className="-mt-1 text-[10px] text-[#9298a2]">{category._count.products.toLocaleString("fa-IR")} کالا</small></BuilderPart>
            </Link>
          );
        })}
      </DragScrollRow>
    </>
  );
}
