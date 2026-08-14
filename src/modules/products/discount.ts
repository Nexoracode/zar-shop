export type DiscountType = "PERCENT" | "FIXED";

export type ProductDiscountLike = {
  discountType: DiscountType | null;
  discountValue: number | string | { toString(): string } | null;
  discountStartsAt: Date | string | null;
  discountEndsAt: Date | string | null;
};

export function isProductDiscountActive(product: ProductDiscountLike, now = new Date()) {
  const value = new Prisma.Decimal(product.discountValue?.toString() ?? 0);
  const startsAt = product.discountStartsAt ? new Date(product.discountStartsAt) : null;
  const endsAt = product.discountEndsAt ? new Date(product.discountEndsAt) : null;
  return Boolean(product.discountType && value.greaterThan(0) && startsAt && endsAt && now >= startsAt && now <= endsAt);
}

export function calculateDiscountedPrice(price: number, product: ProductDiscountLike, now = new Date()) {
  const value = new Prisma.Decimal(product.discountValue?.toString() ?? 0);
  const isActive = isProductDiscountActive(product, now);
  if (!isActive || price <= 0) return { originalPrice: price, discountAmount: 0, finalPrice: price, isActive: false };
  const requestedDiscount = (product.discountType === "PERCENT" ? new Prisma.Decimal(price).mul(value).div(100) : value)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
  const discountAmount = Math.min(Math.max(0, requestedDiscount), Math.max(0, price - 1));
  return { originalPrice: price, discountAmount, finalPrice: price - discountAmount, isActive: discountAmount > 0 };
}

export function tehranDateStart(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00.000+03:30`) : null;
}

export function tehranDateEnd(value: string | null | undefined) {
  return value ? new Date(`${value}T23:59:59.999+03:30`) : null;
}

export function formatTehranDateInput(value: Date | null | undefined) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
import { Prisma } from "@generated/prisma/client";
