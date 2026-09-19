import { Layers, Star, Tag } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { isProductDiscountActive } from "@/modules/products/discount";
import type { ProductRow } from "@/components/admin/products-list-data";
import type { BpChartTipRow } from "./ui/chart-tip";
import { BpHoverCard } from "./ui/hover-card";
import { BpTag } from "./ui/tag";

const MAX_PREVIEW_DOTS = 4;

const faNumber = (value: number) => value.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

/** "۲۰٪" for a percentage discount, "۵۰٬۰۰۰ ریال" for a fixed one. */
function discountText(product: ProductRow) {
  const value = Number(product.discountValue ?? 0);
  return product.discountType === "PERCENT" ? `${faNumber(value)}٪` : `${faNumber(value)} ریال`;
}

function discountRows(product: ProductRow): BpChartTipRow[] {
  const rows: BpChartTipRow[] = [{ label: "مقدار", value: discountText(product), color: "var(--bp-danger)" }];
  if (product.discountStartsAt && product.discountEndsAt) {
    rows.push({ label: "شروع", value: formatDateTime(product.discountStartsAt), color: "var(--bp-success)" });
    rows.push({ label: "پایان", value: formatDateTime(product.discountEndsAt), color: "var(--bp-warning)" });
  } else {
    rows.push({ label: "مدت", value: "بدون محدودیت زمانی", color: "var(--bp-muted)" });
  }
  return rows;
}

/** One row per option type: its values as named colour swatches when they are colours, otherwise as plain text. */
function variantRows(product: ProductRow): BpChartTipRow[] {
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
 * The small tags under a product's name: featured, an active discount, and variants. The discount
 * and variants tags open the Blueprint hover card — dated discount details, and each option's
 * values with their colours — so the row itself stays quiet and the name keeps its full width.
 */
export function ProductFlags({ product }: { product: ProductRow }) {
  const discounted = isProductDiscountActive(product);
  const variantCount = product._count.variants;
  if (!product.featured && !discounted && variantCount === 0) return null;

  const preview = previewColors(product);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {product.featured && <BpTag tone="accent"><Star size={11} strokeWidth={2} className="fill-current" aria-hidden />ویژه</BpTag>}
      {discounted && (
        <BpHoverCard label={`تخفیف فعال ${discountText(product)}`} content={{ headingLabel: "تخفیف", heading: "فعال", rows: discountRows(product) }}>
          <BpTag tone="danger"><Tag size={11} strokeWidth={2} aria-hidden />{discountText(product)}</BpTag>
        </BpHoverCard>
      )}
      {variantCount > 0 && (
        <BpHoverCard label={`${faNumber(variantCount)} ترکیب تنوع`} content={{ headingLabel: "تنوع", heading: `${faNumber(variantCount)} ترکیب`, rows: variantRows(product) }}>
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
