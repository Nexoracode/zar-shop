import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, PackageCheck, ShieldCheck } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
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
    <main className="section container product-detail">
      <div className="product-gallery-main">
        {media?.type === "IMAGE" ? <Image width={800} height={800} src={media.url} alt={media.alt ?? product.name} /> : <div className="product-placeholder product-placeholder-large" aria-hidden="true"><span className="jewel-ring" /><span className="jewel-shine">✦</span></div>}
      </div>
      <div className="product-info">
        <span className="eyebrow">{product.category?.name ?? "مجموعه طلا"}</span>
        <h1>{product.name}</h1>
        <p>{product.description ?? "طراحی اصیل و ظریف، همراه با فاکتور رسمی و تضمین اصالت زر گالری."}</p>
        <div className="product-specs"><div><span>وزن</span><strong>{Number(product.weightGrams)} گرم</strong></div><div><span>عیار</span><strong>{product.purity}</strong></div><div><span>موجودی</span><strong>{product.stock > 0 ? "موجود" : "ناموجود"}</strong></div></div>
        <div className="purchase-card">
          <span className="meta">قیمت نهایی بر اساس نرخ {formatMoney(Number(gold.pricePerGram18))}</span>
          <strong className="product-final-price">{formatMoney(total)}</strong>
          <AddToCart productId={product.id} disabled={product.stock < 1} />
        </div>
        <div className="product-assurances"><span><BadgeCheck /> تضمین اصالت</span><span><ShieldCheck /> پرداخت امن</span><span><PackageCheck /> ارسال قابل پیگیری</span></div>
      </div>
    </main>
  );
}
