import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, Sparkles } from "lucide-react";
import { BuilderPart } from "@/components/builder-part";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { ProductListSliderShell } from "@/components/product-list-slider-shell";
import { SquareBanner } from "@/components/square-banner";
import { FlashSaleCountdown } from "@/components/flash-sale-countdown";
import { ProductCard, type ProductCardBuilder } from "@/components/product-card";
import { ProductFeatureTile, ProductRankedItem, ProductThumbItem } from "@/components/product-list-items";
import { ViewAllProductCard } from "@/components/view-all-product-card";
import { isPartHidden, sectionDisplay, type PageDisplay } from "@/modules/page-builder/display-parts";
import type { ProductListData } from "@/modules/page-builder/product-list-data";
import { productListDefaultMoreLabel, type ProductListConfig } from "@/modules/page-builder/product-lists";
import { discountEndMoments } from "@/modules/products/discount-window";

// The small cards of the looks that show a row of compact products (picture, name and price only).
const compactWidth = "w-[128px] min-w-[128px] snap-start sm:w-[142px] sm:min-w-[142px]";
const cardWidth = "w-[164px] min-w-[164px] snap-start sm:w-[206px] sm:min-w-[206px] lg:w-[218px] lg:min-w-[218px]";

function Shell({ children, roomy = false }: { children: ReactNode; /** The roomier padding of the ranked list. */ roomy?: boolean }) {
  return <div className={`min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white ${roomy ? "px-4 py-6 sm:px-6 lg:px-8 lg:py-8" : "px-4 py-5 sm:px-6 lg:px-7 lg:py-7"}`}>{children}</div>;
}

const rankedPerColumn = 3;

type Props = {
  /** The section's id in the layout — also the key its display switches are stored under. */
  sectionId: string;
  config: ProductListConfig;
  /** The description's HTML, already cleaned by the caller — it is the one place that HTML reaches the page. */
  descriptionHtml: string;
  data: ProductListData;
  display: PageDisplay;
  /** The viewer can edit the page: switched-off parts are still rendered so the builder can bring them back. */
  editable: boolean;
};

/**
 * A "product list" homepage section in whichever of its eight looks the configuration asks for. Every switchable
 * piece (title, "view more", arrows, the cards' own parts…) is a `BuilderPart` of the section, so the page builder's
 * display settings work the same in all layouts. See `src/modules/page-builder/product-lists.ts` for the model.
 */
export function ProductListSection({ sectionId, config, descriptionHtml, data, display, editable }: Props) {
  const { products, moreHref, expiry } = data;
  const builder: ProductCardBuilder = { section: sectionId, hiddenParts: sectionDisplay(display, sectionId).hiddenParts, editable };
  const part = (id: string) => ({ section: sectionId, id, hidden: isPartHidden(display, sectionId, id), editable });

  if (products.length === 0) return <p className="m-0 rounded-2xl border border-dashed border-[#d5d9e0] bg-white p-6 text-center text-sm text-[#858b95]">«{config.title}» هنوز محصولی برای نمایش ندارد.</p>;

  const description = descriptionHtml;
  const richStyle = "[&_a]:underline [&_p]:m-0 [&_mark]:rounded-sm [&_mark]:px-0.5";
  const headerFor = (divided: boolean) => (
    <div className={divided ? "mb-6 border-b border-slate-100 pb-5" : "mb-5"}>
      <div className="flex items-center justify-between gap-4">
        <BuilderPart {...part("title")}><h2 className="m-0 min-w-0 text-xl font-bold text-[#232934] sm:text-2xl">{config.title}</h2></BuilderPart>
        <BuilderPart {...part("more")}><Link href={moreHref} className="ms-auto inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#232934] transition hover:text-black">{config.moreLabel}<ChevronLeft size={15} /></Link></BuilderPart>
      </div>
      {description && <BuilderPart {...part("description")}><div className={`mb-0 mt-1 text-xs leading-6 text-[#858b95] sm:text-sm ${richStyle}`} dangerouslySetInnerHTML={{ __html: description }} /></BuilderPart>}
    </div>
  );
  const header = headerFor(false);
  const arrows = { section: sectionId, hidden: isPartHidden(display, sectionId, "arrows"), editable };
  const viewAll = (className: string, compact = false) => <BuilderPart {...part("viewAll")} className={className}><ViewAllProductCard href={moreHref} label={config.moreLabel} compact={compact} /></BuilderPart>;
  const compactCards = (items: typeof products) => items.map((product) => <div key={product.id} className={compactWidth}><ProductThumbItem product={product} builder={builder} vertical /></div>);
  const cards = (items: typeof products, className: string, toneOffset = 0, extras: { showCategory?: boolean; flushBottom?: boolean } = {}) => items.map((product, index) => (
    <div key={product.id} className={className}><ProductCard {...product} storefrontVariant="gallery" imageTone={(index + toneOffset) % 4} builder={builder} {...extras} /></div>
  ));
  const refresh = <DiscountExpiryRefresh moments={discountEndMoments(products)} />;
  const [first, ...rest] = products;

  switch (config.layout) {
    case "GRID_COMPACT":
      return <Shell>{header}<div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">{products.map((product, index) => <ProductThumbItem key={product.id} product={product} rank={index + 1} builder={builder} />)}</div>{refresh}</Shell>;

    case "SLIDER":
      // Title and description on the right, the arrows on the left of the same header; the "view all" card ends the row.
      return <Shell>
        <ProductListSliderShell sectionId={sectionId} title={config.title} descriptionHtml={description} moreHref={moreHref} moreLabel={config.moreLabel} hidden={{ title: part("title").hidden, description: part("description").hidden, more: part("more").hidden, arrows: arrows.hidden }} editable={editable} className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cards(products, cardWidth)}{viewAll(cardWidth)}
        </ProductListSliderShell>{refresh}
      </Shell>;

    case "FEATURE_SLIDER": {
      // The square banner picture (or, without one, the first product as a big tile) opens the row of full product cards; the
      // "view all" button sits opposite the title.
      const banner = config.banner;
      const listed = banner ? products : rest;
      return <Shell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <BuilderPart {...part("title")}><h2 className="m-0 text-xl font-bold text-[#232934] sm:text-2xl">{config.title}</h2></BuilderPart>
            {description && <BuilderPart {...part("description")}><div className={`mb-0 mt-1 text-xs leading-6 text-[#858b95] sm:text-sm ${richStyle}`} dangerouslySetInnerHTML={{ __html: description }} /></BuilderPart>}
          </div>
          <BuilderPart {...part("more")}><Link href={moreHref} className="inline-flex h-10 shrink-0 items-center rounded-xl border border-[#d5d9e0] bg-white px-4 text-sm font-bold text-[#232934] transition hover:bg-[#f6f7f9]">{config.moreLabel}</Link></BuilderPart>
        </div>
        <DragScrollRow ariaLabel={config.title} showNavigation navigationPart={arrows} className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {banner
            ? <BuilderPart {...part("banner")} className="contents"><SquareBanner src={banner.url} alt={banner.alt ?? config.title} href={banner.href || undefined} /></BuilderPart>
            : <div className="flex w-[240px] min-w-[240px] snap-start sm:w-[300px] sm:min-w-[300px]"><ProductFeatureTile product={first} builder={builder} className="min-h-[200px] w-full" /></div>}
          {cards(listed, cardWidth, banner ? 0 : 1, { showCategory: true, flushBottom: true })}{viewAll(cardWidth)}
        </DragScrollRow>{refresh}
      </Shell>;
    }

    case "BANNER_ROW":
      // One row: the banner (the first product) on the right, the other products as small cards to its left.
      return <Shell>{header}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <ProductFeatureTile product={first} builder={builder} className="min-h-[170px] lg:min-h-0 lg:w-[38%] lg:shrink-0" />
          {rest.length > 0 && <div className="grid min-w-0 flex-1 grid-cols-3 content-start gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">{rest.map((product) => <ProductThumbItem key={product.id} product={product} builder={builder} vertical />)}</div>}
        </div>
        {refresh}
      </Shell>;

    case "FEATURE_LIST":
      return <Shell>{header}
        <div className="grid gap-5 lg:grid-cols-2">
          <ProductFeatureTile product={first} builder={builder} className="min-h-[280px]" />
          <div className="grid content-start divide-y divide-[#eef0f3]">{rest.map((product) => <ProductThumbItem key={product.id} product={product} builder={builder} large />)}</div>
        </div>{refresh}
      </Shell>;

    case "PANEL_SLIDER":
      // A colored panel: the title (with its icon and description) on the right of its header, the timer and the "view
      // all" link on the left, and the cards in a white strip below with the arrows at its edges.
      return (
        <div className="overflow-hidden rounded-2xl p-3 sm:p-4 lg:p-5" style={{ background: "linear-gradient(225deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%)" }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:mb-4">
            <div className="flex min-w-0 items-center gap-3">
              <BuilderPart {...part("icon")}><Sparkles size={28} className="shrink-0 text-[var(--brand-primary-foreground)]" /></BuilderPart>
              <div className="min-w-0">
                <BuilderPart {...part("title")}><strong className="block text-lg font-extrabold leading-7 text-[var(--brand-primary-foreground)] sm:text-2xl sm:leading-8">{config.title}</strong></BuilderPart>
                {description && <BuilderPart {...part("description")}><div className={`m-0 text-xs leading-5 text-[var(--brand-primary-foreground)]/80 sm:text-sm ${richStyle}`} dangerouslySetInnerHTML={{ __html: description }} /></BuilderPart>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {config.source === "DISCOUNTED" && expiry && <BuilderPart {...part("countdown")}><FlashSaleCountdown endsAt={expiry} className="shrink-0" /></BuilderPart>}
              <BuilderPart {...part("more")}><Link href={moreHref} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary-foreground)] transition hover:opacity-80 sm:text-sm">{config.moreLabel}<ChevronLeft size={15} /></Link></BuilderPart>
            </div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl bg-white p-3 sm:p-4">
            <DragScrollRow ariaLabel={config.title} showNavigation navigationPart={arrows} className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {compactCards(products)}{viewAll(compactWidth, true)}
            </DragScrollRow>
          </div>
          {refresh}
        </div>
      );

    case "LIST_TWO_COLUMNS": {
      // "List mode", the look of the best-selling products: columns of three ranked rows, four columns on a wide
      // screen and a snapping row of columns on a narrow one.
      const columns = Array.from({ length: Math.ceil(products.length / rankedPerColumn) }, (_, index) => products.slice(index * rankedPerColumn, (index + 1) * rankedPerColumn));
      return <Shell roomy>{headerFor(true)}
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:gap-0 lg:overflow-visible lg:pb-0">
          {columns.map((column, columnIndex) => (
            <div key={column[0].id} className="grid min-w-[285px] snap-start divide-y divide-slate-100 px-1 sm:min-w-[330px] lg:min-w-0 lg:border-l lg:border-slate-100 lg:px-5 lg:last:border-l-0">
              {column.map((product, rowIndex) => <ProductRankedItem key={product.id} product={product} rank={columnIndex * rankedPerColumn + rowIndex + 1} builder={builder} />)}
            </div>
          ))}
        </div>{refresh}
      </Shell>;
    }

    case "GROUPED_PANELS": {
      const groups: (typeof products)[] = [];
      for (let index = 0; index < products.length; index += 4) groups.push(products.slice(index, index + 4));
      return <Shell>{header}
        <div className="grid gap-4 md:grid-cols-3">
          {groups.map((group, index) => (
            <div key={index} className="grid grid-cols-2 gap-1 rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] p-2">
              {group.map((product) => <ProductThumbItem key={product.id} product={product} builder={builder} vertical />)}
            </div>
          ))}
        </div>{refresh}
      </Shell>;
    }
  }
}
