"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import { useCompare } from "@/components/compare-provider";
import { COMPARE_MAX } from "@/modules/compare/compare";

/**
 * The floating "compare" bar, Digikala-style: appears once at least one product is picked, sits
 * above the mobile bottom nav, and links through to `/compare`. Hidden on the compare page
 * itself, where the same list is already the whole screen.
 */
export function CompareTray() {
  const { items, count, remove, clear } = useCompare();
  const pathname = usePathname();

  if (count === 0 || pathname === "/compare") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[66px] z-[120] px-3 lg:bottom-5 lg:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-[1100px] flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_12px_40px_rgba(15,23,42,.18)]">
        <span className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
          <Scale size={17} className="text-[var(--brand-primary)]" />
          مقایسه کالا
          <span className="text-[var(--muted)]">({count.toLocaleString("fa-IR")} از {COMPARE_MAX.toLocaleString("fa-IR")})</span>
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {items.map((item) => (
            <div key={item.id} className="relative shrink-0">
              <span className="grid size-12 place-items-center overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                {item.image ? <Image src={item.image} alt={item.name} width={48} height={48} className="size-full object-contain p-1" /> : <Scale size={16} className="text-[var(--muted)]" />}
              </span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`حذف ${item.name} از مقایسه`}
                className="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--danger)]"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={clear} className="rounded-lg px-2 py-2 text-[11px] font-bold text-[var(--muted)] transition hover:text-[var(--danger)]">
            حذف همه
          </button>
          <Link
            href="/compare"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-xs font-bold text-[var(--brand-primary-foreground)]"
          >
            <Scale size={15} />مقایسه
          </Link>
        </div>
      </div>
    </div>
  );
}
