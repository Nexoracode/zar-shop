import Link from "next/link";
import type { ReactNode } from "react";

export function AccountReviewsPanel({ active, children }: { active: "pending" | "reviews" | "questions"; children: ReactNode }) {
  const tabs = [
    { id: "pending", label: "در انتظار دیدگاه", href: "/account/reviews/pending" },
    { id: "reviews", label: "دیدگاه‌های من", href: "/account/reviews" },
    { id: "questions", label: "پرسش‌های من", href: null },
  ] as const;
  return <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"><header className="px-6 pb-6 pt-8"><h1 className="m-0 text-base font-black">دیدگاه‌ها و پرسش‌ها</h1></header><nav aria-label="بخش‌های دیدگاه و پرسش" className="flex min-h-14 items-end gap-7 border-b border-[var(--border)] px-6">{tabs.map((tab) => tab.href ? <Link key={tab.id} href={tab.href} aria-current={active === tab.id ? "page" : undefined} className={`relative flex min-h-12 items-center pb-1 text-sm transition ${active === tab.id ? "font-black text-[var(--brand-primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-[var(--brand-primary)]" : "font-bold text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{tab.label}</Link> : <span key={tab.id} aria-disabled="true" className="flex min-h-12 cursor-not-allowed items-center pb-1 text-sm font-bold text-slate-300">{tab.label}</span>)}</nav>{children}</section>;
}
