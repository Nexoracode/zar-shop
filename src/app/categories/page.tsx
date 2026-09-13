import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoriesBrowser } from "@/components/categories-browser";
import { StorefrontSearch } from "@/components/storefront-search";
import { getCategoryTree } from "@/modules/products/category-tree";

export default async function CategoriesPage() {
  const categories = await getCategoryTree();
  return (
    // The fixed bottom tab nav (h-[66px]) overlays whatever's at the bottom of the scrollable
    // page below lg; this page has no footer to absorb that (see AppChrome's hideFooter), so the
    // last accordion row was ending up stuck under the nav. Same fix as account/layout.tsx.
    <main className="min-h-[70vh] bg-white pb-[calc(66px+env(safe-area-inset-bottom)+16px)] lg:pb-0" dir="rtl">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--border)] bg-white px-3 py-3 lg:hidden">
        <Link href="/" aria-label="بازگشت به صفحه اصلی" className="grid size-10 shrink-0 place-items-center text-[var(--foreground)]"><ArrowRight size={22} /></Link>
        <StorefrontSearch variant="field" className="w-full" />
      </div>
      <CategoriesBrowser categories={categories} />
    </main>
  );
}
