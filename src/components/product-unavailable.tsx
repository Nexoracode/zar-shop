import Link from "next/link";
import { Home, PackageX, Search } from "lucide-react";
import { Card } from "@/components/hero";

/**
 * Shown when a product row still exists but is no longer published. It is deliberately distinct
 * from the generic 404: the visitor followed a link that used to work, so the page says what
 * happened and offers the product's own category as the next step.
 */
export function ProductUnavailable({ name, categorySlug, categoryName }: { name: string; categorySlug: string | null; categoryName: string | null }) {
  return (
    <main className="grid min-h-[65vh] place-items-center px-4 py-16">
      <Card variant="secondary" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-tertiary)] text-[var(--muted)]"><PackageX size={26} /></span>
        <h1 className="m-0 text-lg font-bold text-[var(--foreground)]">این محصول غیرفعال یا حذف شده است</h1>
        <p className="mb-0 mt-2 text-sm leading-7 text-[var(--muted)]">
          «{name}» در حال حاضر در فروشگاه نمایش داده نمی‌شود. ممکن است موقتاً از انتشار خارج شده باشد یا دیگر ارائه نشود.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {categorySlug && categoryName
            ? <Link href={`/products?category=${categorySlug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)]"><Search size={17} />محصولات {categoryName}</Link>
            : <Link href="/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)]"><Search size={17} />مشاهده محصولات</Link>}
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-bold text-[var(--foreground)] transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"><Home size={17} />بازگشت به صفحه اصلی</Link>
        </div>
      </Card>
    </main>
  );
}
