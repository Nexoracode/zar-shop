import type { Metadata } from "next";
import Link from "next/link";
import { CompareView } from "@/components/compare-view";

export const metadata: Metadata = {
  title: "مقایسهٔ کالا",
  description: "کالاهای انتخابی را کنار هم و بر اساس مشخصات، قیمت و امتیاز مقایسه کنید.",
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <main className="mx-auto w-[min(1200px,calc(100%-24px))] py-6 sm:w-[min(1200px,calc(100%-40px))] sm:py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]" aria-label="مسیر صفحه">
        <Link href="/" className="transition hover:text-[var(--foreground)]">خانه</Link><span>/</span><span className="text-[var(--foreground)]">مقایسهٔ کالا</span>
      </nav>
      <h1 className="mb-1 text-lg font-bold text-[var(--foreground)] sm:text-xl">مقایسهٔ کالا</h1>
      <p className="mb-5 text-xs text-[var(--muted)]">کالاهای هم‌دسته را بر اساس قیمت، امتیاز و مشخصات کنار هم ببینید.</p>
      <CompareView />
    </main>
  );
}
