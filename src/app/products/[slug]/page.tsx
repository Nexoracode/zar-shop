import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, BadgePercent, PackageCheck, ShieldCheck } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { PriceTooltip } from "@/components/price-tooltip";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { parseOptionValues } from "@/modules/products/options";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, gold, settings] = await Promise.all([
    db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } }, options: { orderBy: { position: "asc" } }, optionGuide: true } }),
    getGoldPriceForDisplay(),
    getGeneralStoreSettings(),
  ]);
  if (!product) notFound();

  const optionValues = product.options
    .map((option) => ({ option, values: parseOptionValues(option.values).filter((item) => item.isActive) }))
    .filter(({ values }) => values.length > 0);
  const colorIds = [...new Set(optionValues.flatMap(({ values }) => values.flatMap((item) => item.colorId ? [item.colorId] : [])))];
  const colors = colorIds.length ? await db.color.findMany({ where: { id: { in: colorIds }, isActive: true }, select: { id: true, name: true, hex: true } }) : [];
  const colorsById = new Map(colors.map((color) => [color.id, color]));

  const rate = gold ? Number(gold.pricePerGram18) : null;
  const parts = product.storeIndustry === "GOLD" && rate !== null ? calculateProductPrice({ goldPricePerGram18: rate, weightGrams: Number(product.weightGrams), purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue), profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent) }) : null;
  const baseTotal = product.fixedPrice ? Number(product.fixedPrice) : parts?.total ?? null;
  const discounted = baseTotal === null ? null : calculateDiscountedPrice(baseTotal, product);
  const total = discounted?.finalPrice ?? null;
  const priceForVariant = (weightGrams: string | null, price: string | null) => {
    if (product.storeIndustry === "GENERAL") {
      const basePrice = price ? Number(price) : product.fixedPrice ? Number(product.fixedPrice) : null;
      return basePrice === null ? null : calculateDiscountedPrice(basePrice, product).finalPrice;
    }
    if (!weightGrams) return null;
    if (product.fixedPrice) return calculateDiscountedPrice(Number(product.fixedPrice), product).finalPrice;
    if (rate === null) return null;
    return calculateDiscountedPrice(calculateProductPrice({ goldPricePerGram18: rate, weightGrams: Number(weightGrams), purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue), profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent) }).total, product).finalPrice;
  };
  const media = product.media[0]?.media;

  return (
    <main className="px-5 py-12 sm:px-6 sm:py-[86px]">
      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-start gap-9 md:grid-cols-[1.08fr_0.92fr] md:gap-[clamp(38px,6vw,86px)]">

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
        <div className="pt-0 md:pt-7">
          <span className="inline-block text-[#785b27] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">
            {product.category?.name ?? "مجموعه طلا"}
          </span>
          <h1 className="mt-[5px] mb-[14px] text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.3] font-medium">{product.name}</h1>
          <div className="rich-text-content text-[#747982]" dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(product.description || `<p>طراحی اصیل و ظریف، همراه با فاکتور رسمی و تضمین اصالت ${settings.storeName}.</p>`) }} />

          {/* Specs */}
          <div className="my-[30px] grid grid-cols-3 border-y border-[#e7e6e2]">
            {(product.storeIndustry === "GOLD" ? [["وزن", `${Number(product.weightGrams)} گرم`], ["عیار", String(product.purity)], ["موجودی", product.stock > 0 ? "موجود" : "ناموجود"]] : [["کد کالا", product.sku], ["نوع محصول", "کالای فروشگاهی"], ["موجودی", product.stock > 0 ? "موجود" : "ناموجود"]]).map(([label, val]) => (
              <div key={label} className="py-[17px] px-3 grid gap-[2px] text-center border-l border-[#e7e6e2] last:border-l-0">
                <span className="text-[#747982] text-[0.75rem]">{label}</span>
                <strong className="text-[0.9rem]">{val}</strong>
              </div>
            ))}
          </div>

          {/* Purchase card */}
          <div className="p-6 grid gap-[15px] bg-[#f5f5f3] border-r-[3px] border-[#b5904c]">
            <span className="text-[#747982] text-[0.82rem]">
              {product.storeIndustry === "GENERAL"
                ? "قیمت فروش محصول"
                : product.fixedPrice
                ? "قیمت ثابت محصول"
                : rate === null
                  ? "نرخ لحظه‌ای طلا موقتاً در دسترس نیست."
                  : `قیمت نهایی بر اساس نرخ ${formatMoney(rate, settings.currency)}`}
            </span>
            {product.storeIndustry === "GOLD" && rate !== null && <PriceTooltip />}
            <strong className="text-[#1c3155] text-[1.55rem]">
              {total === null ? "امکان محاسبه قیمت وجود ندارد" : formatMoney(total, settings.currency)}
            </strong>
            {discounted?.isActive && <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-slate-400 line-through">{formatMoney(discounted.originalPrice, settings.currency)}</span><span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600"><BadgePercent size={14} />{product.discountType === "PERCENT" ? `${Number(product.discountValue).toLocaleString("fa-IR")}٪ تخفیف` : `${formatMoney(discounted.discountAmount, settings.currency)} تخفیف`}</span></div>}
            <AddToCart
              productId={product.id}
              currency={settings.currency}
              options={optionValues.map(({ option, values }) => ({ id: option.id, name: option.name, values: values.map((item) => ({ value: item.value, stock: item.stock ?? product.stock, weightGrams: item.weightGrams, price: priceForVariant(item.weightGrams, item.price), color: item.colorId ? colorsById.get(item.colorId) ?? null : null })) }))}
              optionGuide={product.optionGuide && product.optionGuide.type !== "VIDEO" ? { url: product.optionGuide.url, type: product.optionGuide.type, title: product.optionGuide.title ?? "راهنمای انتخاب محصول" } : null}
              disabled={product.stock < 1 || total === null}
              disabledLabel={product.stock < 1 ? "ناموجود" : "قیمت موقتاً نامشخص"}
            />
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
