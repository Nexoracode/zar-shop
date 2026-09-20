import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckCircle2, Headset, PackageCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { AddToCart, ProductPurchaseProvider, VariantStockLabel } from "@/components/add-to-cart";
import { PriceTooltip } from "@/components/price-tooltip";
import { ProductDetailGallery } from "@/components/product-detail-gallery";
import { ExpandableContent } from "@/components/expandable-content";
import { ProductTitleActions } from "@/components/product-title-actions";
import { ProductDetailTopBar } from "@/components/product-detail-top-bar";
import { getCartProductCount } from "@/modules/cart/cart-summary";
import { ProductDetailSectionNav } from "@/components/product-detail-section-nav";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { ProductCard } from "@/components/product-card";
import { ProductSpecifications } from "@/components/product-specifications";
import { ProductReviews } from "@/components/product-reviews";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { buildProductAttributeGroups } from "@/modules/products/attributes";
import { isProductDiscountActive } from "@/modules/products/discount";
import { productColorIds, productOptionTypeInclude, selectableTypes } from "@/modules/products/variant-selection";
import { lineUnitPrice } from "@/modules/products/line-pricing";
import { findVariant, variantPricing } from "@/modules/products/variants";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { calculateSoldPercent, completedSaleOrderStatuses } from "@/modules/products/sales";
import { getRecentlyViewedProducts, getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getSeoSettings } from "@/modules/settings/seo-settings";
import { getCurrentUser } from "@/modules/auth/session";
import { getStorefrontProductReviews } from "@/modules/reviews/service";
import { ProductActivityTracker } from "@/components/product-activity-tracker";
import { ProductUnavailable } from "@/components/product-unavailable";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { discountEndMoments } from "@/modules/products/discount-window";
import { env } from "@/lib/env";

// The status filter is deliberately absent: the page needs to tell an unpublished product
// apart from a slug that never existed, so that the first case can explain itself instead of
// falling through to a bare 404. Not cached: the row carries raw Prisma `Decimal` fields
// (weightGrams, makingFeeValue, profitPercent, taxPercent, fixedPrice, discountValue) — exactly
// the financial fields the project requires exact Decimal precision for, and "use cache" can't
// serialize a Decimal instance (RSC/Client Component serialization rejects class instances).
async function getProductForPage(slug: string, industry: "GOLD" | "GENERAL") {
  return db.product.findFirst({ where: { slug, storeIndustry: industry }, include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } }, variants: true, optionTypes: productOptionTypeInclude, optionGuide: true } });
}

function plainProductDescription(product: { name: string; description: string | null }, storeName: string) {
  return product.description
    ? product.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180)
    : `${product.name} با تضمین اصالت و ارسال قابل پیگیری از ${storeName}.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  // getProductForPage is an uncached raw DB read (see its own comment); mark this metadata
  // generation as request-time explicitly so Next doesn't attempt to prerender through it.
  await connection();
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

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ variant?: string }> }) {
  // Reads the viewer's session (favorite state, personalization) alongside uncached data
  // (live gold price, catalog settings) inside the Promise.all below, and that cookies() read
  // can't reliably establish dynamic rendering on its own during prerendering when it's racing
  // other reads concurrently. `connection()` marks this render as request-time explicitly.
  await connection();
  const { slug } = await params;
  // A shared link can name the variant it was copied on (`?variant=<id>`), so it opens on that one.
  const { variant: requestedVariantId } = await searchParams;
  const settings = await getGeneralStoreSettings();
  const [product, gold, catalogSettings, currentUser, seo] = await Promise.all([
    getProductForPage(slug, settings.industry),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    getCatalogSettings(),
    getCurrentUser(),
    getSeoSettings(),
  ]);
  if (!product) notFound();
  // `/products?category=` 404s on a category that is not active, so only link to a live one.
  if (product.status !== "ACTIVE") {
    const category = product.category?.isActive ? product.category : null;
    return <ProductUnavailable name={product.name} categorySlug={category?.slug ?? null} categoryName={category?.name ?? null} />;
  }

  const pickerTypes = selectableTypes(product.optionTypes);
  const colorIds = productColorIds(product.optionTypes);
  const [colors, soldAggregate, reviewData, initialFavorite, cartCount, cartItems] = await Promise.all([
    colorIds.length ? db.color.findMany({ where: { id: { in: colorIds }, isActive: true }, select: { id: true, name: true, hex: true } }) : Promise.resolve([]),
    db.orderItem.aggregate({ where: { productId: product.id, order: { status: { in: [...completedSaleOrderStatuses] } } }, _sum: { quantity: true } }),
    getStorefrontProductReviews(product.id, currentUser?.id ?? null),
    currentUser && !currentUser.isGuest ? db.productFavorite.findUnique({ where: { userId_productId: { userId: currentUser.id, productId: product.id } }, select: { id: true } }).then(Boolean) : Promise.resolve(false),
    currentUser ? getCartProductCount(currentUser.id, settings.industry) : Promise.resolve(0),
    currentUser ? db.cartItem.findMany({ where: { productId: product.id, cart: { userId: currentUser.id } }, select: { id: true, selectionKey: true, quantity: true } }) : Promise.resolve([]),
  ]);
  // What this visitor already has in the cart for this product, so the purchase card shows it after a reload.
  const initialCartLines = cartItems.flatMap((item) => {
    const selection = item.selectionKey === "" ? {} : (findVariant(product.variants, item.selectionKey)?.selection ?? null);
    return selection === null ? [] : [{ id: item.id, quantity: item.quantity, selection: selection as Record<string, string> }];
  });
  const soldPercent = calculateSoldPercent(soldAggregate._sum.quantity ?? 0, product.stock);
  const colorsById = new Map(colors.map((color) => [color.id, color]));
  const attributeGroups = buildProductAttributeGroups(product.category?.attributeSchema, product.attributes);
  const primaryFeatures = attributeGroups.flatMap((group) => group.attributes).filter((attribute) => attribute.important);

  const rate = gold?.pricePerGram18 ?? null;
  // Every product is sold as variants, so the page opens on one: the first that can be bought
  // (else the first at all). Its price is what shows until the visitor picks something else.
  const requestedVariant = product.variants.find((variant) => variant.id === requestedVariantId && variant.isActive) ?? null;
  const openingVariant = requestedVariant ?? product.variants.find((variant) => variant.isActive && variant.stock > 0) ?? product.variants[0] ?? null;
  const discounted = openingVariant ? lineUnitPrice(product, openingVariant.selectionKey, rate) : null;
  const total = discounted?.finalPrice ?? null;
  // One entry per variant the gallery badge can be asked about (a product without options has just
  // its default one, whose selection is empty), so the client can show the discount that applies to
  // whatever is actually selected, rather than an aggregate across every variant the product offers.
  const discountBySelection = product.variants.map((variant) => ({ selection: (variant.selection ?? {}) as Record<string, string>, ...variantPricing(variant, product) })).map((entry) => ({
    selection: entry.selection,
    hasDiscount: isProductDiscountActive(entry),
    discountEndsAt: entry.discountEndsAt ? entry.discountEndsAt.toISOString() : null,
  }));
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

  /*
   * The pickers are keyed by type name, which is also what a combination's selection is keyed by
   * and what the cart endpoint hashes — so a choice made here needs no translation on the way in.
   * A value stays selectable while any buyable combination still contains it.
   */
  const cartOptions = pickerTypes.map((type) => ({
    id: type.name,
    name: type.name,
    kind: type.kind,
    values: type.values.map((value) => ({
      value: value.label,
      stock: Math.max(0, ...product.variants
        .filter((variant) => variant.isActive && (variant.selection as Record<string, string>)?.[type.name] === value.label)
        .map((variant) => variant.stock)),
      color: value.colorId ? colorsById.get(value.colorId) ?? null : null,
    })),
  }));

  const purchasableVariants = product.variants.map((variant) => {
    const pricing = lineUnitPrice(product, variant.selectionKey, rate);
    return {
      id: variant.id,
      selection: (variant.selection ?? {}) as Record<string, string>,
      price: pricing?.finalPrice ?? null,
      originalPrice: pricing?.originalPrice ?? null,
      discountEndsAt: pricing?.discountEndsAt ? pricing.discountEndsAt.toISOString() : null,
      stock: variant.stock,
      preparationDays: variant.preparationDays,
      available: variant.isActive && variant.stock > 0,
    };
  });

  const initialSelectedOptions = (requestedVariant ? purchasableVariants.find((variant) => variant.id === requestedVariant.id) : undefined)?.selection
    ?? purchasableVariants.find((variant) => variant.available)?.selection ?? {};
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
  // Same threshold the admin panel's own stock column warns at, so the storefront's urgency
  // matches what the seller configured rather than an unrelated number of its own.
  // Stock is the picked variant's, worked out in the browser as the visitor chooses — the product's own
  // stock is only the total of all of them.
  const purchaseMeta = <VariantStockLabel showStock={catalogSettings.showProductStock} lowStockThreshold={catalogSettings.catalogLowStockThreshold} />;
  const ticketHref = `/account/tickets/new?productId=${product.id}`;
  const resolvedTicketHref = currentUser && !currentUser.isGuest ? ticketHref : `/login?redirect=${encodeURIComponent(ticketHref)}`;
  const purchaseFooter = (
    <Link
      href={resolvedTicketHref}
      className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
    >
      <Headset size={16} />گفتگو با پشتیبان
    </Link>
  );
  const cartProps = {
    productId: product.id,
    currency: settings.currency,
    preparationDays: product.preparationDays,
    options: cartOptions,
    variants: purchasableVariants,
    optionGuide: product.optionGuide && product.optionGuide.type !== "VIDEO" ? { url: product.optionGuide.url, type: product.optionGuide.type, title: product.optionGuide.title ?? "راهنمای انتخاب محصول" } : null,
    disabled: product.stock < 1 || total === null,
    disabledLabel: product.stock < 1 ? "ناموجود" : "قیمت موقتاً نامشخص",
    purchaseSummary,
    purchaseMeta,
    purchaseFooter,
    purchasePrice: total,
    purchaseOriginalPrice: discounted?.isActive ? discounted.originalPrice : null,
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

  return <ProductPurchaseProvider productId={product.id} variantIds={purchasableVariants.map((variant) => ({ id: variant.id, selection: variant.selection, stock: variant.stock }))} initialSelectedOptions={initialSelectedOptions} initialCartLines={initialCartLines}><ProductDetailTopBar productName={product.name} cartCount={cartCount} ticketHref={resolvedTicketHref} /><ProductActivityTracker productId={product.id} enabled={Boolean(currentUser && !currentUser.isGuest)} />{seo.enableProductSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />}<main className="bg-white px-4 pb-16 pt-5 antialiased sm:px-6 lg:pb-24">
    <div className="mx-auto w-full max-w-[1440px]">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="مسیر محصول">
        <Link href="/" className="transition hover:text-slate-900">خانه</Link><span>/</span><Link href="/products" className="transition hover:text-slate-900">محصولات</Link>{product.category && <><span>/</span><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="transition hover:text-slate-900">{product.category.name}</Link></>}
      </nav>

      <div className="grid items-stretch gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section className="grid items-start gap-7 lg:grid-cols-[minmax(330px,1.05fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_auto] lg:gap-x-7 lg:gap-y-5">
            <ProductDetailGallery media={galleryMedia} productName={product.name} productCode={product.sku} ticketHref={resolvedTicketHref} discountBySelection={discountBySelection} soldPercent={soldPercent} compareItem={{ id: product.id, slug: product.slug, name: product.name, image: galleryMedia.find((item) => item.type === "IMAGE")?.url ?? null, categoryId: product.categoryId, categoryName: product.category?.name ?? null }} />

            <div className="min-w-0 lg:col-start-2 lg:row-start-1">
              <div className="flex items-center justify-between gap-3">
                {product.category ? <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="text-sm font-bold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">{product.category.name}</Link> : <span />}
                <ProductTitleActions productId={product.id} productName={product.name} initialFavorite={initialFavorite} />
              </div>
              <h1 className="mb-4 mt-3 text-base font-bold leading-7 text-slate-900 sm:text-lg lg:text-xl">{product.name}</h1>
              <p dir="ltr" className="border-b border-slate-200 pb-4 text-left text-xs text-slate-400">{product.sku}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800"><Star size={16} className="fill-[var(--warning)] text-[var(--warning)]" />{reviewData.summary.average.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</span><span className="size-1 rounded-full bg-slate-300" /><Link href="#reviews" className="font-bold text-[var(--brand-accent)]">{reviewData.summary.count.toLocaleString("fa-IR")} دیدگاه</Link>
              </div>
              <AddToCart {...cartProps} layout="product-detail" showPurchaseCard={false} showMobileBar />
              {primaryFeatures.length > 0 && <section className="mt-7" aria-labelledby="primary-features-title"><h2 id="primary-features-title" className="sr-only">ویژگی‌ها</h2><DragScrollRow ariaLabel="ویژگی‌های کلیدی" className="flex w-full gap-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{primaryFeatures.map((feature) => <div key={feature.id} className="grid shrink-0 gap-1 whitespace-nowrap text-right"><span className="text-[11px] text-slate-500">{feature.name}</span><strong className="text-xs font-bold text-slate-900">{feature.values.join("، ")}</strong></div>)}</DragScrollRow><div className="mt-4 flex items-center gap-4"><span className="h-px flex-1 bg-slate-200" /><Link href="#specifications" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-normal text-slate-800 transition hover:border-slate-400">مشاهده همه ویژگی‌ها <span aria-hidden="true">‹</span></Link><span className="h-px flex-1 bg-slate-200" /></div></section>}
            </div>
          </section>
        </div>
        <AddToCart {...cartProps} layout="product-detail" showOptionFields={false} purchaseCardClassName="h-full" purchaseCardStickyTop="var(--product-primary-purchase-offset, 6rem)" />
      </div>

      <div className="mt-10 grid w-full grid-cols-2 gap-3 border-y border-slate-200 py-5 text-xs text-slate-600 sm:grid-cols-4">
        <span className="flex items-center gap-2"><ShieldCheck size={22} className="text-slate-500" />ضمانت اصالت کالا</span><span className="flex items-center gap-2"><Truck size={22} className="text-slate-500" />ارسال قابل پیگیری</span><span className="flex items-center gap-2"><PackageCheck size={22} className="text-slate-500" />بسته‌بندی مطمئن</span><span className="flex items-center gap-2"><CheckCircle2 size={22} className="text-slate-500" />پرداخت امن</span>
      </div>

      <DiscountExpiryRefresh moments={discountEndMoments([...relatedProducts, ...recentlyViewed])} />
      {product.category && relatedProducts.length > 0 && <section className="mt-12 border-t border-slate-200 py-8" aria-labelledby="related-products-title">
        <div className="mb-6 flex items-center justify-between gap-4"><h2 id="related-products-title" className="relative w-fit pb-3 text-lg font-bold text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)]">کالاهای مرتبط</h2><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="shrink-0 text-xs font-bold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">مشاهده همه</Link></div>
        <DragScrollRow ariaLabel="کالاهای مرتبط" showNavigation className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{relatedProducts.map((item, index) => <div key={item.id} className="w-[176px] min-w-[176px] sm:w-[210px] sm:min-w-[210px]"><ProductCard {...item} storefrontVariant="gallery" imageTone={index} /></div>)}</DragScrollRow>
      </section>}

      {recentlyViewed.length > 0 && <section className="mt-12 border-t border-slate-200 py-8" aria-labelledby="recently-viewed-title">
        <div className="mb-6 flex items-center justify-between gap-4"><h2 id="recently-viewed-title" className="relative w-fit pb-3 text-lg font-bold text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)]">بازدیدهای اخیر شما</h2><Link href="/account/recent-visits" className="shrink-0 text-xs font-bold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">مشاهده همه</Link></div>
        <DragScrollRow ariaLabel="بازدیدهای اخیر شما" showNavigation className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{recentlyViewed.map((item, index) => <div key={item.id} className="w-[176px] min-w-[176px] sm:w-[210px] sm:min-w-[210px]"><ProductCard {...item} storefrontVariant="gallery" imageTone={index} /></div>)}</DragScrollRow>
      </section>}

      <ProductDetailSectionNav />

      <div className="grid items-stretch gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
      <section id="introduction" className="border-b border-slate-200 py-9" style={{ scrollMarginTop: "var(--product-detail-anchor-offset, 96px)" }} aria-labelledby="introduction-title">
        <SectionTitle id="introduction-title">معرفی</SectionTitle>
        <ExpandableContent>
          <div className="rich-text-content max-w-5xl text-sm leading-8 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(product.description || `<p>${product.name} با تضمین اصالت، اطلاعات شفاف و ارسال قابل پیگیری از ${settings.storeName} عرضه می‌شود.</p>`) }} />
        </ExpandableContent>
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
        <AddToCart {...cartProps} layout="product-detail" showOptionFields={false} purchaseCardClassName="order-first h-full pt-6 lg:order-none" purchaseCardStickyTop="var(--product-detail-purchase-offset, 6rem)" showFlashOffer />
      </div>
    </div>
  </main></ProductPurchaseProvider>;
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="relative mb-8 w-fit pb-3 text-lg font-bold text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)]">{children}</h2>;
}
