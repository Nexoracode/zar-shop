/**
 * Why an order's shipping costs nothing, so the checkout can say so instead of only printing
 * «رایگان». Pure and free of server imports: the summary card, on the server and in the browser,
 * builds its sentence from this.
 */
export type FreeShippingReason =
  | { kind: "PICKUP" }
  | { kind: "THRESHOLD"; threshold: number }
  | { kind: "PROMOTION"; title: string }
  | { kind: "METHOD"; title: string }
  | { kind: "NO_FEE" };

export function freeShippingReason(input: {
  /** What the customer pays for shipping, after any promotion. */
  shipping: number;
  deliveryMethod: "INSURED_SHIPPING" | "STORE_PICKUP";
  freeShippingThreshold: number | null;
  merchandiseAmount: number;
  /** How much of the shipping fee a promotion took off, and the promotion's name. */
  shippingDiscount: number;
  promotionTitle?: string | null;
  /** The carrier method that priced it, and what it charged (null when it is not known). */
  methodTitle?: string | null;
  methodPrice?: number | null;
}): FreeShippingReason | null {
  if (input.shipping > 0) return null;
  if (input.deliveryMethod === "STORE_PICKUP") return { kind: "PICKUP" };
  if (input.freeShippingThreshold !== null && input.merchandiseAmount >= input.freeShippingThreshold) return { kind: "THRESHOLD", threshold: input.freeShippingThreshold };
  if (input.shippingDiscount > 0) return { kind: "PROMOTION", title: input.promotionTitle || "کد تخفیف" };
  if (input.methodTitle && (input.methodPrice ?? 0) === 0) return { kind: "METHOD", title: input.methodTitle };
  return { kind: "NO_FEE" };
}
