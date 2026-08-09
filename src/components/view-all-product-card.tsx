import Link from "next/link";

type Props = {
  href: string;
};

export function ViewAllProductCard({ href }: Props) {
  return (
    <Link
      href={href}
      className="grid h-full min-h-[230px] place-items-center rounded-[7px] border border-dashed border-[#cfd3da] bg-[#f6f7f8] px-4 text-center text-sm font-black text-[var(--brand-primary)] transition hover:border-[var(--brand-primary)] hover:bg-[#f0f2f5] sm:min-h-[285px]"
    >
      نمایش همه
    </Link>
  );
}
