import Image from "next/image";
import Link from "next/link";
import { Sparkles, Tag } from "lucide-react";
import { DragScrollRow } from "@/components/drag-scroll-row";

export type HomepageBrandItem = { id: string; name: string; slug: string; logo: { url: string; alt: string | null } | null };

/** The homepage's "محبوب‌ترین برندها" strip — every برند marked `featured`, linking to the
 * catalogue filtered to it, the same role the CATEGORIES section already plays for categories. */
export function HomepageBrands({ brands }: { brands: HomepageBrandItem[] }) {
  if (!brands.length) return null;
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-5 sm:px-6 lg:px-7 lg:py-7" aria-label="محبوب‌ترین برندها">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="m-0 flex items-center gap-2 text-xl font-bold text-[#232934] sm:text-2xl"><Sparkles size={19} className="text-[var(--brand-accent)]" aria-hidden />محبوب‌ترین برندها</h2>
      </div>
      <DragScrollRow ariaLabel="محبوب‌ترین برندها" showNavigation className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {brands.map((brand) => (
          <Link key={brand.id} href={`/products?brandSlug=${brand.slug}`} className="grid w-[104px] min-w-[104px] shrink-0 snap-start justify-items-center gap-2 rounded-xl border border-[#e6e8ec] bg-white p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md sm:w-[120px] sm:min-w-[120px]">
            <span className="relative grid h-12 w-full place-items-center">
              {brand.logo ? <Image src={brand.logo.url} alt={brand.logo.alt ?? brand.name} fill sizes="100px" className="object-contain" /> : <Tag size={22} className="text-slate-300" aria-hidden />}
            </span>
            <span className="w-full truncate text-xs font-bold text-[#3d4450]">{brand.name}</span>
          </Link>
        ))}
      </DragScrollRow>
    </section>
  );
}
