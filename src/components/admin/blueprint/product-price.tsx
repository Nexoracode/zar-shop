import { combinationLabel } from "@/modules/products/discount-summary";
import { isDefaultSelection } from "@/modules/products/variant-combinations";
import type { ProductRow } from "@/components/admin/products-list-data";
import type { BpChartTipRow } from "./ui/chart-tip";
import { BpHoverCard } from "./ui/hover-card";

/**
 * A product's price column — a gold shop's weight — read from its variants; the product's own
 * columns are only a mirror of one of them. The bare number, because the unit sits in the column
 * header. A product whose combinations differ shows the lowest as «از …», and hovering lists each
 * combination's own figure.
 */
export function ProductPrice({ product }: { product: ProductRow }) {
  const gold = product.storeIndustry === "GOLD";
  const format = (value: number) => value.toLocaleString("fa-IR", { maximumFractionDigits: gold ? 3 : 0 });
  const figure = (variant: ProductRow["variants"][number]) => {
    const value = gold ? variant.weightGrams ?? product.weightGrams : variant.price;
    return value === null || value === undefined ? null : Number(value);
  };

  const sellable = product.variants.filter((variant) => variant.isActive);
  const values = (sellable.length ? sellable : product.variants).flatMap((variant) => { const value = figure(variant); return value === null ? [] : [value]; });
  if (values.length === 0) return <>{gold ? format(Number(product.weightGrams)) : "بدون قیمت"}</>;

  const lowest = Math.min(...values);
  const differs = Math.max(...values) !== lowest;
  const combinations = product.variants.filter((variant) => !isDefaultSelection(variant.selection));
  if (!differs || combinations.length === 0) return <>{format(lowest)}</>;

  const rows: BpChartTipRow[] = combinations.map((variant) => {
    const value = figure(variant);
    return {
      label: variant.isActive ? combinationLabel(variant.selection) : `${combinationLabel(variant.selection)} (غیرفعال)`,
      value: value === null ? "بدون قیمت" : `${format(value)} ${gold ? "گرم" : "ریال"}`,
      color: variant.isActive ? "var(--bp-accent)" : "var(--bp-muted)",
    };
  });
  return (
    <BpHoverCard label={`از ${format(lowest)}، در ${combinations.length.toLocaleString("fa-IR")} ترکیب`} content={{ headingLabel: gold ? "وزن" : "قیمت", heading: `از ${format(lowest)} ${gold ? "گرم" : "ریال"}`, rows }}>
      <span className="border-b border-dotted border-current">از {format(lowest)}</span>
    </BpHoverCard>
  );
}
