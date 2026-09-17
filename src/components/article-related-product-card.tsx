import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImageOff } from "lucide-react";

type RelatedProduct = {
  name: string;
  href: string;
  price: string;
  image?: { src: string; alt: string };
};

export function ArticleRelatedProductCard({ product }: { product: RelatedProduct }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--brand-accent)] bg-[var(--surface)]">
      <div className="px-4 pt-3.5">
        <span className="text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--brand-accent) 65%, black)" }}>مرتبط با این مقاله</span>
      </div>
      <div className="relative mx-auto mt-2.5 aspect-square w-full max-w-[160px] bg-[var(--surface-tertiary)]">
        {product.image ? (
          <Image src={product.image.src} alt={product.image.alt} fill sizes="160px" className="object-contain" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[var(--muted)]"><ImageOff size={26} /></div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-1.5 text-[14.5px] font-bold text-[var(--foreground)]">{product.name}</div>
        <div className="mb-3 text-[15px] font-bold" style={{ color: "color-mix(in srgb, var(--brand-accent) 65%, black)" }}>{product.price}</div>
        <Link href={product.href} className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-accent)] py-2.5 text-[13px] font-bold text-[var(--brand-accent-foreground)]">
          مشاهده و خرید از فروشگاه<ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  );
}
