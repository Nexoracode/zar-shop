import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, Sparkles } from "lucide-react";
import { BuilderPart } from "@/components/builder-part";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { FlashSaleCountdown } from "@/components/flash-sale-countdown";
import { ProductCard, type ProductCardBuilder } from "@/components/product-card";
import { ProductFeatureTile, ProductRankedItem, ProductThumbItem } from "@/components/product-list-items";
import { ViewAllProductCard } from "@/components/view-all-product-card";
import { isPartHidden, sectionDisplay, type PageDisplay } from "@/modules/page-builder/display-parts";
import type { ProductListData } from "@/modules/page-builder/product-list-data";
import type { ProductListConfig } from "@/modules/page-builder/product-lists";
import { sanitizeSectionDescription } from "@/modules/page-builder/rich-text-sanitize";
import { discountEndMoments } from "@/modules/products/discount-window";

const cardWidth = "w-[164px] min-w-[164px] snap-start sm:w-[206px] sm:min-w-[206px] lg:w-[218px] lg:min-w-[218px]";
const panelCardWidth = "w-[calc(50%-2px)] min-w-[calc(50%-2px)] snap-start sm:w-[220px] sm:min-w-[220px] lg:w-[224px] lg:min-w-[224px]";

function Shell({ children, roomy = false }: { children: ReactNode; /** The roomier padding of the ranked list. */ roomy?: boolean }) {
  return <div className={`min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white ${roomy ? "px-4 py-6 sm:px-6 lg:px-8 lg:py-8" : "px-4 py-5 sm:px-6 lg:px-7 lg:py-7"}`}>{children}</div>;
}

const rankedPerColumn = 3;

type Props = {
  /** The section's id in the layout — also the key its display switches are stored under. */
  sectionId: string;
  config: ProductListConfig;
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
export function ProductListSection({ sectionId, config, data, display, editable }: Props) {
  const { products, moreHref, expiry } = data;
  const builder: ProductCardBuilder = { section: sectionId, hiddenParts: sectionDisplay(display, sectionId).hiddenParts, editable };
  const part = (id: string) => ({ section: sectionId, id, hidden: isPartHidden(display, sectionId, id), editable });

  if (products.length === 0) return <p className="m-0 rounded-2xl border border-dashed border-[#d5d9e0] bg-white p-6 text-center text-sm text-[#858b95]">«{config.title}» هنوز محصولی برای نمایش ندارد.</p>;

  // Cleaned again here, however it was stored: this is the one place the description's HTML reaches the page.
  const description = sanitizeSectionDescription(config.description);
  const richStyle = "[&_a]:underline [&_p]:m-0 [&_mark]:rounded-sm [&_mark]:px-0.5";
  const headerFor = (divided: boolean) => (
    <div className={`flex items-end justify-between gap-4 ${divided ? "mb-6 border-b border-slate-100 pb-5" : "mb-5"}`}>
      <div className="min-w-0">
        <BuilderPart {...part("title")}><h2 className="m-0 text-xl font-bold text-[#232934] sm:text-2xl">{config.title}</h2></BuilderPart>
        {description && <BuilderPart {...part("description")}><div className={`mb-0 mt-1 text-xs leading-6 text-[#858b95] sm:text-sm ${richStyle}`} dangerouslySetInnerHTML={{ __html: description }} /></BuilderPart>}
      </div>
      <BuilderPart {...part("more")}><Link href={moreHref} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#232934] transition hover:text-black">مشاهده همه<ChevronLeft size={15} /></Link></BuilderPart>
    </div>
  );
  const header = headerFor(false);
  const arrows = { section: sectionId, hidden: isPartHidden(display, sectionId, "arrows"), editable };
  const viewAll = (className: string) => <BuilderPart {...part("viewAll")} className={className}><ViewAllProductCard href={moreHref} /></BuilderPart>;
  const cards = (items: typeof products, className: string, toneOffset = 0) => items.map((product, index) => (
    <div key={product.id} className={className}><ProductCard {...product} storefrontVariant="gallery" imageTone={(index + toneOffset) % 4} builder={builder} /></div>
  ));
  const refresh = <DiscountExpiryRefresh moments={discountEndMoments(products)} />;
  const [first, ...rest] = products;

  switch (config.layout) {
    case "GRID_COMPACT":
      return <Shell>{header}<div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductThumbItem key={product.id} product={product} builder={builder} />)}</div>{refresh}</Shell>;

    case "SLIDER":
      return <Shell>{header}
        <DragScrollRow ariaLabel={config.title} showNavigation navigationPart={arrows} className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cards(products, cardWidth)}{viewAll(cardWidth)}
        </DragScrollRow>{refresh}
      </Shell>;

    case "FEATURE_SLIDER":
      return <Shell>{header}
        <DragScrollRow ariaLabel={config.title} showNavigation navigationPart={arrows} className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-[240px] min-w-[240px] snap-start sm:w-[300px] sm:min-w-[300px]"><ProductFeatureTile product={first} builder={builder} className="w-full" /></div>
          {cards(rest, cardWidth, 1)}{viewAll(cardWidth)}
        </DragScrollRow>{refresh}
      </Shell>;

    case "BANNER_ROW":
      return <Shell>{header}
        <ProductFeatureTile product={first} builder={builder} className="min-h-[200px] sm:aspect-[21/8]" />
        {rest.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{rest.map((product, index) => <ProductCard key={product.id} {...product} storefrontVariant="gallery" imageTone={(index + 1) % 4} builder={builder} />)}</div>}
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
      return (
        <div className="overflow-hidden rounded-2xl" style={{ background: "linear-gradient(225deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%)" }}>
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-5 lg:flex-col lg:justify-center lg:gap-6 lg:self-stretch lg:px-5 lg:pb-5 lg:pt-3">
              <BuilderPart {...part("icon")}><Sparkles size={24} className="shrink-0 text-[var(--brand-primary-foreground)] lg:size-16" /></BuilderPart>
              <BuilderPart {...part("title")}><strong className="shrink-0 text-lg font-extrabold leading-6 text-[var(--brand-primary-foreground)] lg:text-center lg:text-2xl lg:leading-8">{config.title}</strong></BuilderPart>
              {description && <BuilderPart {...part("description")}><div className={`m-0 hidden max-w-[11rem] text-center text-xs leading-5 text-[var(--brand-primary-foreground)]/80 lg:block ${richStyle}`} dangerouslySetInnerHTML={{ __html: description }} /></BuilderPart>}
              {config.source === "DISCOUNTED" && expiry && <BuilderPart {...part("countdown")}><FlashSaleCountdown endsAt={expiry} className="shrink-0" /></BuilderPart>}
              <BuilderPart {...part("more")} className="contents"><Link href={moreHref} className="mr-auto inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--brand-primary-foreground)] lg:mr-0 lg:mt-1 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm lg:transition lg:hover:bg-black/5">
                <span className="lg:hidden">همه</span><span className="hidden lg:inline">مشاهده همه</span><ChevronLeft size={15} />
              </Link></BuilderPart>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">
              <DragScrollRow ariaLabel={config.title} showNavigation navigationPart={arrows} className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {cards(products, panelCardWidth)}{viewAll(panelCardWidth)}
              </DragScrollRow>
            </div>
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
