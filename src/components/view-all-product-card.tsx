import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  href: string;
};

export function ViewAllProductCard({ href }: Props) {
  return (
    <Link
      href={href}
      className="group grid h-full min-h-[230px] place-items-center rounded-[7px] border border-[#e4e7eb] bg-white px-4 text-center text-sm font-black text-[var(--brand-primary)] transition hover:border-[#cbd0d7] hover:bg-[#fafafa] sm:min-h-[285px]"
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
