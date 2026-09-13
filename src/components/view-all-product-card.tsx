import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  href: string;
  /** The trailing-card treatment used by the "شگفت‌انگیز" flash-deal strip: smaller icon, flat
   * height (matches the strip's own cards) and rounded only on the outer end, instead of the tall
   * standalone tile used at the end of a normal product rail. */
  compact?: boolean;
  roundedSide?: "right" | "left" | "none";
};

export function ViewAllProductCard({ href, compact = false, roundedSide = "none" }: Props) {
  if (compact) {
    const roundedClass = roundedSide === "right" ? "rounded-r-md" : roundedSide === "left" ? "rounded-l-md" : "";
    return (
      <Link href={href} className={`group flex min-w-[114px] shrink-0 flex-col items-center justify-center gap-3 bg-white transition hover:bg-[#fafafa] sm:min-w-[164px] ${roundedClass}`}>
        <span className="grid size-10 place-items-center rounded-full border-2 border-[#4b5563] text-[#4b5563] transition group-hover:-translate-x-1">
          <ArrowLeft size={18} />
        </span>
        <span className="text-sm font-bold text-[#3d4450]">مشاهده همه</span>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="group grid h-full min-h-[230px] place-items-center rounded-[7px] bg-white px-4 text-center text-sm font-bold text-[var(--brand-primary)] transition hover:bg-[#fafafa] sm:min-h-[285px]"
    >
      <span className="grid justify-items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full border-2 border-[#4b5563] text-[#4b5563] transition group-hover:-translate-x-1">
          <ArrowLeft size={22} />
        </span>
        مشاهده همه
      </span>
    </Link>
  );
}
