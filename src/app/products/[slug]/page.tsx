import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgePercent, CheckCircle2, PackageCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { PriceTooltip } from "@/components/price-tooltip";
import { ProductDetailGallery } from "@/components/product-detail-gallery";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { buildProductAttributeGroups } from "@/modules/products/attributes";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { parseOptionValues } from "@/modules/products/options";
import { calculateProductPrice } from "@/modules/products/pricing";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

const mockReviewCount = 127;
const mockRating = 4.6;
const mockReviews = [
  { id: "review-1", name: "مریم احمدی", date: "۱۸ مرداد ۱۴۰۵", rating: 5, title: "کیفیت عالی", body: "کیفیت ساخت خیلی خوب بود و محصول کاملاً سالم و با بسته‌بندی مرتب به دستم رسید." },
  { id: "review-2", name: "علی رضایی", date: "۱۲ مرداد ۱۴۰۵", rating: 4, title: "مطابق تصاویر", body: "ظاهر و مشخصات محصول دقیقاً با توضیحات صفحه هماهنگ بود. از خریدم رضایت دارم." },
  { id: "review-3", name: "سارا محمدی", date: "۶ مرداد ۱۴۰۵", rating: 5, title: "پیشنهاد می‌کنم", body: "ارسال سریع انجام شد و تجربه خرید خوبی داشتم. برای خرید دوباره هم انتخابش می‌کنم." },
];

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getGeneralStoreSettings();
  const [product, gold, catalogSettings] = await Promise.all([
    db.product.findFirst({ where: { slug, status: "ACTIVE", storeIndustry: settings.industry }, include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } }, options: { orderBy: { position: "asc" } }, optionGuide: true } }),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    getCatalogSettings(),
  ]);
  if (!product) notFound();

  const optionValues = product.options
    .map((option) => ({ option, values: parseOptionValues(option.values).filter((item) => item.isActive) }))
    .filter(({ values }) => values.length > 0);
  const colorIds = [...new Set(optionValues.flatMap(({ values }) => values.flatMap((item) => item.colorId ? [item.colorId] : [])))];
  const colors = colorIds.length ? await db.color.findMany({ where: { id: { in: colorIds }, isActive: true }, select: { id: true, name: true, hex: true } }) : [];
  const colorsById = new Map(colors.map((color) => [color.id, color]));
  const attributeGroups = buildProductAttributeGroups(product.category?.attributeSchema, product.attributes);
  const primaryFeatures = attributeGroups.flatMap((group) => group.attributes).slice(0, 4);

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
  const galleryMedia = product.media.reduce<Array<{ id: string; type: "IMAGE" | "VIDEO"; url: string; alt: string }>>((items, item) => {
    if (item.media.type === "IMAGE" || item.media.type === "VIDEO") items.push({ id: item.media.id, type: item.media.type, url: item.media.url, alt: item.media.alt ?? product.name });
    return items;
  }, []);
  const baseSpecifications = product.storeIndustry === "GOLD"
    ? [{ label: "کد کالا", value: product.sku }, { label: "وزن", value: `${Number(product.weightGrams).toLocaleString("fa-IR")} گرم` }, { label: "عیار", value: product.purity.toLocaleString("fa-IR") }, { label: "دسته‌بندی", value: product.category?.name ?? "بدون دسته‌بندی" }]
    : [{ label: "کد کالا", value: product.sku }, { label: "دسته‌بندی", value: product.category?.name ?? "بدون دسته‌بندی" }, { label: "وضعیت", value: product.stock > 0 ? "موجود" : "ناموجود" }, { label: "زمان آماده‌سازی", value: `${product.preparationDays.toLocaleString("fa-IR")} روز کاری` }];
  const generalAttributeGroup = attributeGroups.find((group) => group.name === "مشخصات کلی");
  const specificationGroups = [
    { id: "product-general", name: "مشخصات کلی", rows: [...baseSpecifications, ...(generalAttributeGroup?.attributes.map((attribute) => ({ label: attribute.name, value: attribute.values.join("، ") })) ?? [])] },
    ...attributeGroups.filter((group) => group.id !== generalAttributeGroup?.id).map((group) => ({ id: group.id, name: group.name, rows: group.attributes.map((attribute) => ({ label: attribute.name, value: attribute.values.join("، ") })) })),
  ];

  return <main className="bg-white px-4 pb-16 pt-5 sm:px-6 lg:pb-24">
    <div className="mx-auto w-full max-w-[1440px]">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="مسیر محصول">
        <Link href="/" className="transition hover:text-slate-900">خانه</Link><span>/</span><Link href="/products" className="transition hover:text-slate-900">محصولات</Link>{product.category && <><span>/</span><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="transition hover:text-slate-900">{product.category.name}</Link></>}
      </nav>

      <section className="grid items-start gap-7 lg:grid-cols-[minmax(330px,1.05fr)_minmax(0,1.1fr)_320px] lg:grid-rows-[auto_auto] lg:gap-x-7 lg:gap-y-5">
        <ProductDetailGallery media={galleryMedia} productName={product.name} productCode={product.sku} />

        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          {product.category && <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="text-sm font-bold text-sky-600 hover:text-sky-700">{product.category.name}</Link>}
          <h1 className="mb-4 mt-3 text-xl font-black leading-9 text-slate-900 sm:text-2xl">{product.name}</h1>
          <p dir="ltr" className="border-b border-slate-200 pb-4 text-left text-xs text-slate-400">{product.sku}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-slate-700"><Star size={16} className="fill-amber-400 text-amber-400" />{mockRating.toLocaleString("fa-IR")}</span>
            <span className="text-slate-400">از ۵</span>
            <span className="size-1 rounded-full bg-slate-300" />
            <span className="font-bold text-sky-600">{mockReviewCount.toLocaleString("fa-IR")} دیدگاه</span>
          </div>

          {primaryFeatures.length > 0 && <section className="mt-7" aria-labelledby="primary-features-title">
            <h2 id="primary-features-title" className="mb-3 text-base font-black text-slate-900">ویژگی‌ها</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{primaryFeatures.map((feature) => <div key={feature.id} className="rounded-lg bg-slate-100 px-3 py-3"><span className="block text-[11px] text-slate-500">{feature.name}</span><strong className="mt-1 block truncate text-xs text-slate-800">{feature.values.join("، ")}</strong></div>)}</div>
          </section>}
        </div>

        <AddToCart
          layout="product-detail"
          productId={product.id}
          currency={settings.currency}
          preparationDays={product.preparationDays}
          options={optionValues.map(({ option, values }) => ({ id: option.id, name: option.name, kind: values.some((item) => item.colorId) ? "COLOR" as const : "SELECT" as const, values: values.map((item) => ({ value: item.value, stock: item.stock ?? product.stock, weightGrams: item.weightGrams, price: priceForVariant(item.weightGrams, item.price), color: item.colorId ? colorsById.get(item.colorId) ?? null : null })) }))}
          optionGuide={product.optionGuide && product.optionGuide.type !== "VIDEO" ? { url: product.optionGuide.url, type: product.optionGuide.type, title: product.optionGuide.title ?? "راهنمای انتخاب محصول" } : null}
          disabled={product.stock < 1 || total === null}
          disabledLabel={product.stock < 1 ? "ناموجود" : "قیمت موقتاً نامشخص"}
          purchaseSummary={<div className="grid gap-3">
            <span className="text-xs text-slate-500">{product.storeIndustry === "GOLD" && !product.fixedPrice && rate !== null ? `محاسبه‌شده با نرخ ${formatMoney(rate, settings.currency)}` : "قیمت فروش محصول"}</span>
            {product.storeIndustry === "GOLD" && rate !== null && <PriceTooltip />}
            {discounted?.isActive && <div className="flex items-center gap-2"><span className="text-xs text-slate-400 line-through">{formatMoney(discounted.originalPrice, settings.currency)}</span><span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-black text-white"><BadgePercent size={12} />{product.discountType === "PERCENT" ? `${Number(product.discountValue).toLocaleString("fa-IR")}٪` : "تخفیف"}</span></div>}
            <strong className="text-left text-xl font-black text-slate-900" dir="rtl">{total === null ? "قیمت نامشخص" : formatMoney(total, settings.currency)}</strong>
            <span className={`text-xs font-bold ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>{product.stock > 0 ? catalogSettings.showProductStock ? `${product.stock.toLocaleString("fa-IR")} عدد موجود در انبار` : "موجود در انبار" : "در حال حاضر ناموجود"}</span>
          </div>}
        />
      </section>

      <div className="mt-10 grid grid-cols-2 gap-3 border-y border-slate-200 py-5 text-xs text-slate-600 sm:grid-cols-4">
        <span className="flex items-center gap-2"><ShieldCheck size={22} className="text-slate-500" />ضمانت اصالت کالا</span>
        <span className="flex items-center gap-2"><Truck size={22} className="text-slate-500" />ارسال قابل پیگیری</span>
        <span className="flex items-center gap-2"><PackageCheck size={22} className="text-slate-500" />بسته‌بندی مطمئن</span>
        <span className="flex items-center gap-2"><CheckCircle2 size={22} className="text-slate-500" />پرداخت امن</span>
      </div>

      <nav className="sticky top-0 z-20 mt-10 flex gap-7 overflow-x-auto border-b border-slate-200 bg-white/95 px-1 py-4 text-sm font-bold text-slate-600 backdrop-blur" aria-label="بخش‌های صفحه محصول">
        <Link href="#introduction" className="shrink-0 hover:text-rose-500">معرفی</Link><Link href="#specifications" className="shrink-0 hover:text-rose-500">مشخصات</Link><Link href="#reviews" className="shrink-0 hover:text-rose-500">دیدگاه‌ها</Link>
      </nav>

      <section id="introduction" className="scroll-mt-24 border-b border-slate-200 py-9" aria-labelledby="introduction-title">
        <SectionTitle id="introduction-title">معرفی</SectionTitle>
        <div className="rich-text-content max-w-5xl text-sm leading-8 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(product.description || `<p>${product.name} با تضمین اصالت، اطلاعات شفاف و ارسال قابل پیگیری از ${settings.storeName} عرضه می‌شود.</p>`) }} />
      </section>

      <section id="specifications" className="scroll-mt-24 border-b border-slate-200 py-9" aria-labelledby="specifications-title">
        <SectionTitle id="specifications-title">مشخصات</SectionTitle>
        <div className="grid gap-10">
          {specificationGroups.map((group) => <SpecificationGroup key={group.id} title={group.name} rows={group.rows} />)}
        </div>
      </section>

      <section id="reviews" className="scroll-mt-24 py-9" aria-labelledby="reviews-title">
        <SectionTitle id="reviews-title">امتیاز و دیدگاه کاربران</SectionTitle>
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border border-slate-200 p-5 lg:sticky lg:top-24">
            <div className="flex items-end gap-2"><strong className="text-3xl font-black text-slate-900">{mockRating.toLocaleString("fa-IR")}</strong><span className="pb-1 text-xs text-slate-400">از ۵</span></div>
            <div className="my-3 flex gap-1 text-amber-400" aria-label={`${mockRating.toLocaleString("fa-IR")} از ۵ ستاره`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={18} fill={star <= 4 ? "currentColor" : "none"} />)}</div>
            <p className="text-xs text-slate-500">از مجموع {mockReviewCount.toLocaleString("fa-IR")} دیدگاه ثبت‌شده</p>
            <div className="mt-5 grid gap-2.5">{[5, 4, 3, 2, 1].map((score, index) => <div key={score} className="grid grid-cols-[28px_1fr] items-center gap-2 text-[10px] text-slate-500"><span>{score.toLocaleString("fa-IR")}</span><span className="h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${[72, 18, 6, 3, 1][index]}%` }} /></span></div>)}</div>
          </aside>
          <div className="divide-y divide-slate-200 border-y border-slate-200">{mockReviews.map((review) => <article key={review.id} className="py-6 first:pt-0">
            <div className="mb-3 flex flex-wrap items-center gap-3"><span className="rounded bg-emerald-500 px-2 py-1 text-xs font-black text-white">{review.rating.toLocaleString("fa-IR")}</span><strong className="text-sm text-slate-900">{review.title}</strong><span className="mr-auto text-[11px] text-slate-400">{review.date}</span></div>
            <p className="text-sm leading-7 text-slate-600">{review.body}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><span className="grid size-7 place-items-center rounded-full bg-slate-100 font-black text-slate-500">{review.name.slice(0, 1)}</span>{review.name}<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">خریدار محصول</span></div>
          </article>)}</div>
        </div>
      </section>
    </div>
  </main>;
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="relative mb-8 w-fit pb-3 text-lg font-black text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-rose-500">{children}</h2>;
}

function SpecificationGroup({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  return <div><h3 className="mb-4 text-sm font-black text-slate-800">{title}</h3><dl className="m-0 max-w-5xl">{rows.map((row) => <div key={`${title}-${row.label}`} className="grid border-b border-slate-100 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8"><dt className="mb-2 text-xs text-slate-400 sm:mb-0">{row.label}</dt><dd className="m-0 text-sm leading-7 text-slate-700">{row.value}</dd></div>)}</dl></div>;
}
