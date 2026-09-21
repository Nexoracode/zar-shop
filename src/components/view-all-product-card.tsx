import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  href: string;
  /** What the card says (the list's "view all" wording). */
  label?: string;
  /** The small version that sits in a row of compact cards. */
  compact?: boolean;
};

export function ViewAllProductCard({ href, label = "مشاهده همه", compact = false }: Props) {
  return (
    <Link
      href={href}
      className={`group grid h-full place-items-center rounded-[7px] bg-white px-4 text-center font-bold text-[var(--brand-primary)] transition hover:bg-[#fafafa] ${compact ? "min-h-[160px] text-xs" : "min-h-[230px] text-sm sm:min-h-[285px]"}`}
    >
      <span className="grid justify-items-center gap-3">
        <span className={`grid place-items-center rounded-full border-2 border-[#4b5563] text-[#4b5563] transition group-hover:-translate-x-1 ${compact ? "size-9" : "size-12"}`}>
          <ArrowLeft size={compact ? 18 : 22} />
        </span>
        {label}
      </span>
    </Link>
  );
}
