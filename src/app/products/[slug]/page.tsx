import Link from "next/link";
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, PackageCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { AddToCart, ProductPurchaseProvider } from "@/components/add-to-cart";
import { PriceTooltip } from "@/components/price-tooltip";
import { ProductDetailGallery } from "@/components/product-detail-gallery";
import { ProductDetailSectionNav } from "@/components/product-detail-section-nav";
import { ProductCard } from "@/components/product-card";
import { ProductSpecifications } from "@/components/product-specifications";
import { ProductReviews } from "@/components/product-reviews";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { buildProductAttributeGroups } from "@/modules/products/attributes";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { parseOptionValues } from "@/modules/products/options";
import { calculateProductPrice } from "@/modules/products/pricing";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { calculateSoldPercent, completedSaleOrderStatuses } from "@/modules/products/sales";
import { getRecentlyViewedProducts, getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getCurrentUser } from "@/modules/auth/session";
import { getStorefrontProductReviews } from "@/modules/reviews/service";
import { ProductActivityTracker } from "@/components/product-activity-tracker";
import { ProductUnavailable } from "@/components/product-unavailable";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { earliestDiscountExpiry } from "@/modules/products/discount-window";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// The status filter is deliberately absent: the page needs to tell an unpublished product
// apart from a slug that never existed, so that the first case can explain itself instead of
// falling through to a bare 404.
const getProductForPage = cache(async (slug: string, industry: "GOLD" | "GENERAL") =>
  db.product.findFirst({ where: { slug, storeIndustry: industry }, include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } }, options: { orderBy: { position: "asc" } }, optionGuide: true } }));

function plainProductDescription(product: { name: string; description: string | null }, storeName: string) {
  return product.description
    ? product.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180)
    : `${product.name} با تضمین اصالت و ارسال قابل پیگیری از ${storeName}.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getGeneralStoreSettings();
  const product = await getProductForPage(slug, settings.industry);
  if (!product) return {};
  if (product.status !== "ACTIVE") return { title: "محصول در دسترس نیست", robots: { index: false, follow: true } };
  const cover = product.media[0]?.media;
  const description = plainProductDescription(product, settings.storeName);
  const canonicalUrl = `${env.APP_URL}/products/${product.slug}`;
  return {
    title: product.name,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title: product.name, description, type: "website", url: canonicalUrl, images: cover ? [{ url: cover.url, alt: cover.alt ?? product.name }] : undefined },
    twitter: { card: "summary_large_image", title: product.name, description, images: cover ? [cover.url] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getGeneralStoreSettings();
  const [product, gold, catalogSettings, currentUser] = await Promise.all([
    getProductForPage(slug, settings.industry),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    getCatalogSettings(),
    getCurrentUser(),
  ]);
  if (!product) notFound();
  // `/products?category=` 404s on a category that is not active, so only link to a live one.
  if (product.status !== "ACTIVE") {
    const category = product.category?.isActive ? product.category : null;
    return <ProductUnavailable name={product.name} categorySlug={category?.slug ?? null} categoryName={category?.name ?? null} />;
  }

  const optionValues = product.options
    .map((option) => ({ option, values: parseOptionValues(option.values).filter((item) => item.isActive) }))
    .filter(({ values }) => values.length > 0);
  const colorIds = [...new Set(optionValues.flatMap(({ values }) => values.flatMap((item) => item.colorId ? [item.colorId] : [])))];
  const [colors, soldAggregate, reviewData, initialFavorite] = await Promise.all([
    colorIds.length ? db.color.findMany({ where: { id: { in: colorIds }, isActive: true }, select: { id: true, name: true, hex: true } }) : Promise.resolve([]),
    db.orderItem.aggregate({ where: { productId: product.id, order: { status: { in: [...completedSaleOrderStatuses] } } }, _sum: { quantity: true } }),
    getStorefrontProductReviews(product.id, currentUser?.id ?? null),
    currentUser && !currentUser.isGuest ? db.productFavorite.findUnique({ where: { userId_productId: { userId: currentUser.id, productId: product.id } }, select: { id: true } }).then(Boolean) : Promise.resolve(false),
  ]);
  const soldPercent = calculateSoldPercent(soldAggregate._sum.quantity ?? 0, product.stock);
  const colorsById = new Map(colors.map((color) => [color.id, color]));
  const attributeGroups = buildProductAttributeGroups(product.category?.attributeSchema, product.attributes);
  const primaryFeatures = attributeGroups.flatMap((group) => group.attributes).filter((attribute) => attribute.important);

  const rate = gold?.pricePerGram18 ?? null;
  const parts = product.storeIndustry === "GOLD" && rate !== null ? calculateProductPrice({ goldPricePerGram18: rate, weightGrams: product.weightGrams, purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: product.makingFeeValue, profitPercent: product.profitPercent, taxPercent: product.taxPercent }) : null;
  const baseTotal = product.fixedPrice ? Number(product.fixedPrice) : parts?.total ?? null;
  const discounted = baseTotal === null ? null : calculateDiscountedPrice(baseTotal, product);
  const total = discounted?.finalPrice ?? null;
  const pricingForVariant = (weightGrams: string | null, price: string | null) => {
    let variantBase: number | null = null;
    if (product.storeIndustry === "GENERAL") {
      variantBase = price ? Number(price) : null;
    } else if (weightGrams && rate !== null) {
      variantBase = product.fixedPrice ? Number(product.fixedPrice) : calculateProductPrice({ goldPricePerGram18: rate, weightGrams, purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: product.makingFeeValue, profitPercent: product.profitPercent, taxPercent: product.taxPercent }).total;
    }
    if (variantBase === null) return { price: null, originalPrice: null };
    const variantDiscount = calculateDiscountedPrice(variantBase, product);
    return { price: variantDiscount.finalPrice, originalPrice: variantDiscount.isActive ? variantDiscount.originalPrice : null };
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

  const cartOptions = optionValues.map(({ option, values }) => ({
    id: option.id,
    name: option.name,
    kind: option.type,
    values: values.map((item) => {
      const pricing = pricingForVariant(item.weightGrams, item.price);
      return { value: item.value, stock: item.stock ?? product.stock, weightGrams: item.weightGrams, ...pricing, color: item.colorId ? colorsById.get(item.colorId) ?? null : null };
    }),
  }));
  const initialSelectedOptions = Object.fromEntries(cartOptions.flatMap((option) => {
    const firstAvailable = option.values.find((item) => item.stock > 0);
    return firstAvailable ? [[option.id, firstAvailable.value]] : [];
  }));
  const relatedProducts = product.categoryId
    ? (await getStorefrontProductFeed({ sort: "POPULAR", page: 1, pageSize: 8, categoryId: product.categoryId, excludeProductId: product.id })).items
    : [];
  const recentlyViewed = currentUser && !currentUser.isGuest
    ? await getRecentlyViewedProducts({ userId: currentUser.id, excludeProductId: product.id, limit: 8 })
    : [];
  const purchaseSummary = <div className="grid gap-3">
    <span className="text-xs text-slate-500">{product.storeIndustry === "GOLD" && !product.fixedPrice && rate !== null ? `محاسبه‌شده با نرخ ${formatMoney(rate.toString(), settings.currency)}` : "قیمت فروش محصول"}</span>
    {product.storeIndustry === "GOLD" && rate !== null && !product.fixedPrice && <PriceTooltip
      purity={product.purity}
      profitPercent={Number(product.profitPercent)}
      taxPercent={Number(product.taxPercent)}
      makingFeeType={product.makingFeeType}
      makingFeeValue={Number(product.makingFeeValue)}
    />}
  </div>;
  const purchaseMeta = <span className={`text-xs font-bold ${product.stock > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{product.stock > 0 ? catalogSettings.showProductStock ? `${product.stock.toLocaleString("fa-IR")} عدد موجود در انبار` : "موجود در انبار" : "در حال حاضر ناموجود"}</span>;
  const cartProps = {
    productId: product.id,
    currency: settings.currency,
    preparationDays: product.preparationDays,
    options: cartOptions,
    optionGuide: product.optionGuide && product.optionGuide.type !== "VIDEO" ? { url: product.optionGuide.url, type: product.optionGuide.type, title: product.optionGuide.title ?? "راهنمای انتخاب محصول" } : null,
    disabled: product.stock < 1 || total === null,
    disabledLabel: product.stock < 1 ? "ناموجود" : "قیمت موقتاً نامشخص",
    purchaseSummary,
    purchaseMeta,
    purchasePrice: total,
    purchaseOriginalPrice: discounted?.isActive ? discounted.originalPrice : null,
    discountLabel: discounted?.isActive ? product.discountType === "PERCENT" ? `${Number(product.discountValue).toLocaleString("fa-IR")}٪` : "تخفیف" : null,
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: plainProductDescription(product, settings.storeName),
    ...(galleryMedia.length ? { image: galleryMedia.map((item) => item.url) } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    ...(total !== null ? {
      offers: {
        "@type": "Offer",
        url: `${env.APP_URL}/products/${product.slug}`,
        priceCurrency: "IRR",
        price: total,
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    } : {}),
    ...(reviewData.summary.count > 0 ? {
      aggregateRating: { "@type": "AggregateRating", ratingValue: reviewData.summary.average, reviewCount: reviewData.summary.count },
    } : {}),
  };

  return <ProductPurchaseProvider initialSelectedOptions={initialSelectedOptions}><ProductActivityTracker productId={product.id} enabled={Boolean(currentUser && !currentUser.isGuest)} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} /><main className="bg-white px-4 pb-16 pt-5 antialiased sm:px-6 lg:pb-24">
    <div className="mx-auto w-full max-w-[1440px]">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="مسیر محصول">
        <Link href="/" className="transition hover:text-slate-900">خانه</Link><span>/</span><Link href="/products" className="transition hover:text-slate-900">محصولات</Link>{product.category && <><span>/</span><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="transition hover:text-slate-900">{product.category.name}</Link></>}
      </nav>

      <div className="grid items-stretch gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section className="grid items-start gap-7 lg:grid-cols-[minmax(330px,1.05fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_auto] lg:gap-x-7 lg:gap-y-5">
            <ProductDetailGallery productId={product.id} media={galleryMedia} productName={product.name} productCode={product.sku} hasDiscount={Boolean(discounted?.isActive)} discountEndsAt={discounted?.isActive && product.discountEndsAt ? product.discountEndsAt.toISOString() : null} soldPercent={soldPercent} authenticated={Boolean(currentUser && !currentUser.isGuest)} initialFavorite={initialFavorite} />

            <div className="min-w-0 lg:col-start-2 lg:row-start-1">
              {product.category && <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="text-sm font-bold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">{product.category.name}</Link>}
              <h1 className="mb-4 mt-3 text-xl font-normal leading-9 text-slate-900 sm:text-2xl">{product.name}</h1>
              <p dir="ltr" className="border-b border-slate-200 pb-4 text-left text-xs text-slate-400">{product.sku}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-slate-700"><Star size={16} className="fill-amber-400 text-amber-400" />{reviewData.summary.average.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</span><span className="text-slate-400">از ۵</span><span className="size-1 rounded-full bg-slate-300" /><Link href="#reviews" className="font-bold text-[var(--brand-accent)]">{reviewData.summary.count.toLocaleString("fa-IR")} دیدگاه</Link>
              </div>
              <AddToCart {...cartProps} layout="product-detail" showPurchaseCard={false} />
              {primaryFeatures.length > 0 && <section className="mt-8" aria-labelledby="primary-features-title"><h2 id="primary-features-title" className="mb-4 text-base font-normal text-slate-900">ویژگی‌ها</h2><div className="grid grid-cols-2 gap-2">{primaryFeatures.map((feature) => <div key={feature.id} className="min-h-[62px] rounded-lg bg-[var(--surface-tertiary)] px-3 py-2.5 text-right"><span className="block text-[11px] text-slate-400">{feature.name}</span><strong className="mt-1 block truncate text-xs font-normal text-slate-700">{feature.values.join("، ")}</strong></div>)}</div><div className="mt-4 flex items-center gap-4"><span className="h-px flex-1 bg-slate-200" /><Link href="#specifications" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-normal text-slate-800 transition hover:border-slate-400">مشاهده همه ویژگی‌ها <span aria-hidden="true">‹</span></Link><span className="h-px flex-1 bg-slate-200" /></div></section>}
            </div>
          </section>
        </div>
        <AddToCart {...cartProps} layout="product-detail" showOptionFields={false} purchaseCardClassName="h-full" purchaseCardStickyTop="var(--product-primary-purchase-offset, 6rem)" />
      </div>

      <div className="mt-10 grid w-full grid-cols-2 gap-3 border-y border-slate-200 py-5 text-xs text-slate-600 sm:grid-cols-4">
        <span className="flex items-center gap-2"><ShieldCheck size={22} className="text-slate-500" />ضمانت اصالت کالا</span><span className="flex items-center gap-2"><Truck size={22} className="text-slate-500" />ارسال قابل پیگیری</span><span className="flex items-center gap-2"><PackageCheck size={22} className="text-slate-500" />بسته‌بندی مطمئن</span><span className="flex items-center gap-2"><CheckCircle2 size={22} className="text-slate-500" />پرداخت امن</span>
      </div>

      <DiscountExpiryRefresh at={earliestDiscountExpiry([...relatedProducts, ...recentlyViewed])} />
      {product.category && relatedProducts.length > 0 && <section className="mt-12 border-t border-slate-200 py-8" aria-labelledby="related-products-title">
        <div className="mb-6 flex items-center justify-between gap-4"><h2 id="related-products-title" className="relative w-fit pb-3 text-lg font-bold text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)]">کالاهای مرتبط</h2><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="shrink-0 text-xs font-bold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">مشاهده همه</Link></div>
        <div className="flex snap-x gap-4 overflow-x-auto pb-3">{relatedProducts.map((item, index) => <div key={item.id} className="w-[176px] min-w-[176px] snap-start sm:w-[210px] sm:min-w-[210px]"><ProductCard {...item} storefrontVariant="gallery" imageTone={index} /></div>)}</div>
      </section>}

      {recentlyViewed.length > 0 && <section className="mt-12 border-t border-slate-200 py-8" aria-labelledby="recently-viewed-title">
        <div className="mb-6 flex items-center justify-between gap-4"><h2 id="recently-viewed-title" className="relative w-fit pb-3 text-lg font-bold text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)]">بازدیدهای اخیر شما</h2><Link href="/account/recent-visits" className="shrink-0 text-xs font-bold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">مشاهده همه</Link></div>
        <div className="flex snap-x gap-4 overflow-x-auto pb-3">{recentlyViewed.map((item, index) => <div key={item.id} className="w-[176px] min-w-[176px] snap-start sm:w-[210px] sm:min-w-[210px]"><ProductCard {...item} storefrontVariant="gallery" imageTone={index} /></div>)}</div>
      </section>}

      <ProductDetailSectionNav />

      <div className="grid items-stretch gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
      <section id="introduction" className="border-b border-slate-200 py-9" style={{ scrollMarginTop: "var(--product-detail-anchor-offset, 96px)" }} aria-labelledby="introduction-title">
        <SectionTitle id="introduction-title">معرفی</SectionTitle>
        <div className="rich-text-content max-w-5xl text-sm leading-8 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(product.description || `<p>${product.name} با تضمین اصالت، اطلاعات شفاف و ارسال قابل پیگیری از ${settings.storeName} عرضه می‌شود.</p>`) }} />
      </section>

      <section id="specifications" className="border-b border-slate-200 py-9" style={{ scrollMarginTop: "var(--product-detail-anchor-offset, 96px)" }} aria-labelledby="specifications-title">
        <SectionTitle id="specifications-title">مشخصات</SectionTitle>
        <ProductSpecifications groups={specificationGroups} />
      </section>

      <section id="reviews" className="py-9" style={{ scrollMarginTop: "var(--product-detail-anchor-offset, 96px)" }} aria-labelledby="reviews-title">
        <SectionTitle id="reviews-title">امتیاز و دیدگاه کاربران</SectionTitle>
        <ProductReviews productId={product.id} initialData={reviewData} isAuthenticated={Boolean(currentUser && !currentUser.isGuest)} />
      </section>
        </div>
        <AddToCart {...cartProps} layout="product-detail" showOptionFields={false} purchaseCardClassName="order-first h-full pt-6 lg:order-none" purchaseCardStickyTop="var(--product-detail-purchase-offset, 6rem)" />
      </div>
    </div>
  </main></ProductPurchaseProvider>;
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="relative mb-8 w-fit pb-3 text-lg font-bold text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)]">{children}</h2>;
}
