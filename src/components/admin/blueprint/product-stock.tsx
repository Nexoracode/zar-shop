import { combinationLabel } from "@/modules/products/discount-summary";
import { isDefaultSelection } from "@/modules/products/variant-combinations";
import type { ProductRow } from "@/components/admin/products-list-data";
import type { BpChartTipRow } from "./ui/chart-tip";
import { BpHoverCard } from "./ui/hover-card";

const faNumber = (value: number) => value.toLocaleString("fa-IR");

/**
 * A product's stock, read from its variants — the product's own `stock` column is only a mirror of
 * their total. It is the total of the variants that can be sold; when the product has real
 * combinations, hovering it lists each one's own stock, coloured by whether it is out or running low.
 */
export function ProductStock({ product, lowStockThreshold, prefix }: { product: ProductRow; lowStockThreshold: number; /** Text before the number on the mobile card ("موجودی: "). */ prefix?: string }) {
  const total = product.variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
  const combinations = product.variants.filter((variant) => !isDefaultSelection(variant.selection));
  const tone = total <= lowStockThreshold ? "font-bold text-[var(--bp-danger)]" : "";
  const number = <span className={tone}>{prefix}{faNumber(total)}</span>;
  if (combinations.length === 0) return number;

  const rows: BpChartTipRow[] = combinations.map((variant) => ({
    label: variant.isActive ? combinationLabel(variant.selection) : `${combinationLabel(variant.selection)} (غیرفعال)`,
    value: faNumber(variant.stock),
    color: !variant.isActive ? "var(--bp-muted)" : variant.stock <= 0 ? "var(--bp-danger)" : variant.stock <= lowStockThreshold ? "var(--bp-warning)" : "var(--bp-success)",
  }));
  return (
    <BpHoverCard label={`موجودی ${faNumber(total)} در ${faNumber(combinations.length)} ترکیب`} content={{ headingLabel: "موجودی کل", heading: `${faNumber(total)} عدد`, rows }}>
      <span className="border-b border-dotted border-current">{number}</span>
    </BpHoverCard>
  );
}
