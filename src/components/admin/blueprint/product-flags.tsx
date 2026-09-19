import { Layers, Tag } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { summarizeDiscounts, type DiscountEntry } from "@/modules/products/discount-summary";
import type { ProductRow } from "@/components/admin/products-list-data";
import type { BpChartTipRow } from "./ui/chart-tip";
import { BpHoverCard } from "./ui/hover-card";
import { BpTag } from "./ui/tag";

const MAX_PREVIEW_DOTS = 4;

const faNumber = (value: number) => value.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

/** "۲۰٪" for a percentage discount, "۵۰٬۰۰۰ ریال" for a fixed one. */
function amountText(entry: DiscountEntry) {
  return entry.type === "PERCENT" ? `${faNumber(entry.value)}٪` : `${faNumber(entry.value)} ریال`;
}

function windowText(entry: DiscountEntry) {
  return entry.startsAt && entry.endsAt ? `از ${formatDateTime(entry.startsAt)} تا ${formatDateTime(entry.endsAt)}` : "بدون محدودیت زمانی";
}

function discountRow(entry: DiscountEntry, color: string): BpChartTipRow {
  return { label: entry.label, value: amountText(entry), color, note: windowText(entry) };
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
 * - the discount tag lists every running discount — the product's own and each combination's — with
 *   its amount and date range, and what is scheduled to start;
 * - the variants tag lists each option's values (colours with their real swatch) and, when any
 *   combination is discounted, those discounts too.
 *
 * `emptyDash` fills the table cell with a dash when the product has neither.
 */
export function ProductFlags({ product, className = "", emptyDash = false }: { product: ProductRow; className?: string; emptyDash?: boolean }) {
  const discounts = summarizeDiscounts(product);
  const variantCount = product._count.variants;
  const hasActive = discounts.active.length > 0;
  const hasUpcoming = discounts.upcoming.length > 0;

  if (!hasActive && !hasUpcoming && variantCount === 0) return emptyDash ? <span className="bp-muted">—</span> : null;

  const preview = previewColors(product);
  const variantDiscounts = [...discounts.active.filter((entry) => entry.scope === "variant").map((entry) => ({ entry, color: "var(--bp-danger)" })), ...discounts.upcoming.filter((entry) => entry.scope === "variant").map((entry) => ({ entry, color: "var(--bp-warning)" }))];

  const discountRows: BpChartTipRow[] = [
    ...discounts.active.map((entry) => discountRow(entry, "var(--bp-danger)")),
    ...(hasActive && hasUpcoming ? [{ label: "زمان‌بندی‌شده", section: true }] : []),
    ...discounts.upcoming.map((entry) => discountRow(entry, "var(--bp-warning)")),
  ];
  const discountTagText = hasActive
    ? (discounts.active.length === 1 ? amountText(discounts.active[0]) : `${faNumber(discounts.active.length)} تخفیف`)
    : "تخفیف آینده";

  const variantRows: BpChartTipRow[] = [
    ...optionRows(product),
    ...(variantDiscounts.length ? [{ label: "تخفیف ترکیب‌ها", section: true }, ...variantDiscounts.map(({ entry, color }) => discountRow(entry, color))] : []),
  ];

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`.trim()}>
      {(hasActive || hasUpcoming) && (
        <BpHoverCard
          label={hasActive ? `تخفیف فعال ${discountTagText}` : "تخفیف زمان‌بندی‌شده"}
          content={{ headingLabel: "تخفیف", heading: hasActive ? (discounts.active.length === 1 ? "فعال" : `${faNumber(discounts.active.length)} مورد فعال`) : "به‌زودی", rows: discountRows }}
        >
          <BpTag tone={hasActive ? "danger" : "warning"}><Tag size={11} strokeWidth={2} aria-hidden />{discountTagText}</BpTag>
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
