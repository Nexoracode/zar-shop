import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, PackageCheck, ShieldCheck } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { PriceTooltip } from "@/components/price-tooltip";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, gold] = await Promise.all([
    db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } } } }),
    getGoldPrice(),
  ]);
  if (!product) notFound();

  const parts = calculateProductPrice({ goldPricePerGram18: Number(gold.pricePerGram18), weightGrams: Number(product.weightGrams), purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue), profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent) });
  const total = product.fixedPrice ? Number(product.fixedPrice) : parts.total;
  const media = product.media[0]?.media;

  return (
    <main className="py-[86px]">
      <div className="w-[min(1240px,calc(100%-40px))] mx-auto grid grid-cols-[1.08fr_0.92fr] gap-[clamp(38px,6vw,86px)] items-start max-[760px]:grid-cols-1">

        {/* Gallery */}
        <div className="aspect-square overflow-hidden bg-[#f5f5f3]">
          {media?.type === "IMAGE" ? (
            <Image width={800} height={800} src={media.url} alt={media.alt ?? product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center relative bg-[radial-gradient(circle_at_50%_44%,#fff_0_9%,transparent_10%),linear-gradient(145deg,#f8f7f4,#e9e5df)]" aria-hidden="true">
              <span className="block w-[35%] aspect-square border-[clamp(9px,1.5vw,17px)] border-[#c49a4d] rounded-full -rotate-[18deg] shadow-[inset_0_0_0_4px_#f8dda1,0_18px_32px_rgba(75,52,19,0.2)]" />
              <span className="absolute top-[27%] right-[29%] text-white text-2xl drop-shadow-[0_0_14px_#fff]">✦</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-7 max-[760px]:pt-0">
          <span className="inline-block text-[#785b27] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">
            {product.category?.name ?? "مجموعه طلا"}
          </span>
          <h1 className="mt-[5px] mb-[14px] text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.3] font-medium">{product.name}</h1>
          <p className="text-[#747982]">{product.description ?? "طراحی اصیل و ظریف، همراه با فاکتور رسمی و تضمین اصالت زر گالری."}</p>

          {/* Specs */}
          <div className="my-[30px] grid grid-cols-3 border-y border-[#e7e6e2]">
            {[["وزن", `${Number(product.weightGrams)} گرم`], ["عیار", String(product.purity)], ["موجودی", product.stock > 0 ? "موجود" : "ناموجود"]].map(([label, val]) => (
              <div key={label} className="py-[17px] px-3 grid gap-[2px] text-center border-l border-[#e7e6e2] last:border-l-0">
                <span className="text-[#747982] text-[0.75rem]">{label}</span>
                <strong className="text-[0.9rem]">{val}</strong>
              </div>
            ))}
          </div>

          {/* Purchase card */}
          <div className="p-6 grid gap-[15px] bg-[#f5f5f3] border-r-[3px] border-[#b5904c]">
            <span className="text-[#747982] text-[0.82rem]">قیمت نهایی بر اساس نرخ {formatMoney(Number(gold.pricePerGram18))}</span>
            <PriceTooltip />
            <strong className="text-[#1c3155] text-[1.55rem]">{formatMoney(total)}</strong>
            <AddToCart productId={product.id} disabled={product.stock < 1} />
          </div>

          {/* Assurances */}
          <div className="mt-[22px] flex flex-wrap gap-[17px] text-[#747982] text-[0.76rem]">
            {[
              [<BadgeCheck key="b" />, "تضمین اصالت"],
              [<ShieldCheck key="s" />, "پرداخت امن"],
              [<PackageCheck key="p" />, "ارسال قابل پیگیری"],
            ].map(([icon, label]) => (
              <span key={String(label)} className="inline-flex items-center gap-[5px] [&>svg]:w-[17px] [&>svg]:text-[#785b27]">
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
