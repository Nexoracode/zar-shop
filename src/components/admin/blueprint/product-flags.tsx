import { Layers, Tag } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { summarizeDiscounts, type DiscountEntry } from "@/modules/products/discount-summary";
import type { ProductRow } from "@/components/admin/products-list-data";
import type { BpChartTipRow } from "./ui/chart-tip";
import { BpHoverCard } from "./ui/hover-card";
import { BpTag } from "./ui/tag";

const MAX_PREVIEW_DOTS = 4;
/** Discounted combinations listed in the variants card before the rest are summed up in one line. */
const MAX_LISTED_COMBINATION_DISCOUNTS = 4;

const faNumber = (value: number) => value.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

/** "۲۰٪" for a percentage discount, "۵۰٬۰۰۰ ریال" for a fixed one. */
function amountText(entry: DiscountEntry) {
  return entry.type === "PERCENT" ? `${faNumber(entry.value)}٪` : `${faNumber(entry.value)} ریال`;
}

/**
 * The rows that describe one discount — amount, then its start and end (or that it has no time
 * limit). The product's own card and every discounted combination in the variants card are built
 * from this, so the two read identically: only the heading above them differs.
 */
function discountRows(entry: DiscountEntry, isActive: boolean): BpChartTipRow[] {
  return [
    { label: "مقدار", value: amountText(entry), color: isActive ? "var(--bp-danger)" : "var(--bp-warning)" },
    ...(entry.startsAt && entry.endsAt
      ? [{ label: "شروع", value: formatDateTime(entry.startsAt), color: "var(--bp-success)" }, { label: "پایان", value: formatDateTime(entry.endsAt), color: "var(--bp-warning)" }]
      : [{ label: "مدت", value: "بدون محدودیت زمانی", color: "var(--bp-muted)" }]),
  ];
}

/** A discounted combination as a small titled group of the same rows the product's own discount shows. */
function combinationDiscountRows(entry: DiscountEntry, isActive: boolean): BpChartTipRow[] {
  return [{ label: `تخفیف ${entry.label} · ${isActive ? "فعال" : "به‌زودی"}`, section: true }, ...discountRows(entry, isActive)];
}

/** One row per option type: its values as named colour swatches when they are colours, otherwise as plain text. */
function optionRows(product: ProductRow): BpChartTipRow[] {
  return product.optionTypes.map((optionType) => {
    const values = optionType.values.map((item) => ({ label: item.value.label, color: item.value.color?.hex }));
    return values.some((item) => item.color)
      ? { label: optionType.type.name, swatches: values }
      : { label: optionType.type.name, value: values.map((item) => item.label).join("، ") };
  });
}

/** The first few colours among a product's option values, for the dots shown inside the variants tag. */
function previewColors(product: ProductRow) {
  const colors = product.optionTypes.flatMap((optionType) => optionType.values.flatMap((item) => (item.value.color?.hex ? [item.value.color.hex] : [])));
  return { shown: colors.slice(0, MAX_PREVIEW_DOTS), extra: Math.max(0, colors.length - MAX_PREVIEW_DOTS) };
}

/**
 * A product's variants and discounts, as the tags of the "تنوع و تخفیف" column (and under the name
 * on the mobile card). Each opens the Blueprint hover card:
 *
 * - the discount tag is for a discount on the product itself (running, or scheduled to start) and
 *   its card gives the amount and the dates. A product with combinations has none — they carry
 *   the discounts — so it never gets this tag;
 * - the variants tag lists each option's values (colours with their real swatch) and, when any
 *   combination has a discount of its own, each of those in the same layout as the product's own
 *   discount card — so a discount that lives on a combination is shown there and never as a tag
 *   of its own.
 *
 * `emptyDash` fills the table cell with a dash when the product has neither.
 */
export function ProductFlags({ product, className = "", emptyDash = false }: { product: ProductRow; className?: string; emptyDash?: boolean }) {
  const discounts = summarizeDiscounts(product);
  const variantCount = product._count.variants;
  const ownActive = discounts.active.find((entry) => entry.scope === "product");
  const ownUpcoming = discounts.upcoming.find((entry) => entry.scope === "product");
  const own = ownActive ?? ownUpcoming;

  if (!own && variantCount === 0) return emptyDash ? <span className="bp-muted">—</span> : null;

  const preview = previewColors(product);
  const variantDiscounts = [
    ...discounts.active.filter((entry) => entry.scope === "variant").map((entry) => ({ entry, isActive: true })),
    ...discounts.upcoming.filter((entry) => entry.scope === "variant").map((entry) => ({ entry, isActive: false })),
  ];
  const listedVariantDiscounts = variantDiscounts.slice(0, MAX_LISTED_COMBINATION_DISCOUNTS);
  const hiddenVariantDiscounts = variantDiscounts.length - listedVariantDiscounts.length;

  const ownRows = own ? discountRows(own, Boolean(ownActive)) : [];

  const variantRows: BpChartTipRow[] = [
    ...optionRows(product),
    ...listedVariantDiscounts.flatMap(({ entry, isActive }) => combinationDiscountRows(entry, isActive)),
    ...(hiddenVariantDiscounts > 0 ? [{ label: `و ${faNumber(hiddenVariantDiscounts)} ترکیب دیگر با تخفیف`, section: true }] : []),
  ];

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`.trim()}>
      {own && (
        <BpHoverCard
          label={ownActive ? `تخفیف فعال ${amountText(own)}` : `تخفیف ${amountText(own)} زمان‌بندی‌شده`}
          content={{ headingLabel: "تخفیف", heading: ownActive ? "فعال" : "به‌زودی", rows: ownRows }}
        >
          <BpTag tone={ownActive ? "danger" : "warning"}><Tag size={11} strokeWidth={2} aria-hidden />{amountText(own)}</BpTag>
        </BpHoverCard>
      )}
      {variantCount > 0 && (
        <BpHoverCard label={`${faNumber(variantCount)} ترکیب تنوع`} content={{ headingLabel: "تنوع", heading: `${faNumber(variantCount)} ترکیب`, rows: variantRows }}>
          <BpTag tone="info">
            <Layers size={11} strokeWidth={2} aria-hidden />
            {faNumber(variantCount)} تنوع
            {preview.shown.length > 0 && (
              <span className="inline-flex items-center gap-[3px]" aria-hidden>
                {preview.shown.map((hex, index) => <i key={`${hex}-${index}`} className="bp-flag-dot" style={{ background: hex }} />)}
                {preview.extra > 0 && <span className="text-[10px]">+{faNumber(preview.extra)}</span>}
              </span>
            )}
          </BpTag>
        </BpHoverCard>
      )}
    </div>
  );
}
