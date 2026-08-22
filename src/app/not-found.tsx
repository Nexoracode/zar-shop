import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Card } from "@/components/hero";

export default function NotFound() {
  return (
    <main className="grid min-h-[65vh] place-items-center px-4 py-16">
      <Card variant="secondary" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <span className="mx-auto mb-5 block text-5xl font-bold text-[var(--brand-primary)]">۴۰۴</span>
        <h1 className="m-0 text-lg font-bold text-[var(--foreground)]">صفحه مورد نظر پیدا نشد</h1>
        <p className="mb-0 mt-2 text-sm leading-7 text-[var(--muted)]">این نشانی وجود ندارد یا محصول/صفحه موردنظر حذف یا جابه‌جا شده است.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)]"><Home size={17} />بازگشت به صفحه اصلی</Link>
          <Link href="/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-bold text-[var(--foreground)] transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"><Search size={17} />مشاهده محصولات</Link>
        </div>
      </Card>
    </main>
  );
}
