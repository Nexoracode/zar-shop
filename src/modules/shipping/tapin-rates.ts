import { z } from "zod";

/*
 * Tapin's public rate service.
 *
 * The endpoint needs no key — the same host family already supplies this project's province and
 * city list — and it answers in Tapin's own numeric location codes, which `locations/service.ts`
 * already stores as `Province.externalId` / `City.externalId`. So the destination mapping costs
 * nothing here.
 *
 * Everything about this file is a contract with someone else's server, which is why it is the
 * only place that knows the shape. Callers get a number or null; `quote.ts` decides what a null
 * means for the checkout.
 */

const PRICE_URL = "https://public.api.tapin.ir/api/v1/public/check-price/";
const POST_OFFICE_PRICE_URL = "https://public.api.tapin.ir/api/v1/post-office/check-price/";
/** Short: this sits in the checkout path, where a slow answer is worse than a fallback price. */
const TIMEOUT_MS = 8000;

/** Carrier keys, taken from the per-carrier availability blocks in Tapin's own location payload. */
export const tapinRateTypes = ["irpost", "tipax", "railway", "alopeyk", "boxit"] as const;
export type TapinRateType = (typeof tapinRateTypes)[number];

/** 0 cash on delivery, 1 paid online, 2 postage due, 3 free. The store always pays online. */
const PAY_TYPE_ONLINE = 1;

const responseSchema = z.object({
  returns: z.object({ status: z.number(), message: z.string().optional() }),
  entries: z.object({
    send_price: z.coerce.number().nonnegative(),
    just_send_price: z.coerce.number().nonnegative().optional(),
    tax: z.coerce.number().nonnegative().optional(),
    total: z.coerce.number().nonnegative(),
  }),
});

export type TapinRateRequest = {
  rateType: string;
  /** Grams. */
  weightGrams: number;
  /** Declared value, used for insurance; in the store's own currency unit. */
  declaredValue: number;
  orderType: number;
  from: { provinceCode: number; cityCode: number };
  to: { provinceCode: number; cityCode: number };
  boxId?: number;
};

export type TapinRateResult = { total: number; sendPrice: number; tax: number };

/**
 * The carrier's price for one parcel, or null when the service cannot answer.
 *
 * Null covers every failure the same way on purpose — a timeout, a non-200, a route the carrier
 * does not serve, a payload that no longer parses. None of them should reach the customer, and
 * all of them mean the same thing to the caller: use another source.
 */
export async function fetchTapinRate(request: TapinRateRequest): Promise<TapinRateResult | null> {
  const usePostOffice = request.rateType === "irpost";
  const body: Record<string, unknown> = {
    price: Math.max(0, Math.round(request.declaredValue)),
    weight: Math.max(1, Math.round(request.weightGrams)),
    order_type: request.orderType,
    pay_type: PAY_TYPE_ONLINE,
    from_province: request.from.provinceCode,
    from_city: request.from.cityCode,
    to_province: request.to.provinceCode,
    to_city: request.to.cityCode,
  };
  // The multi-carrier endpoint wants the carrier and a box size; the post one takes neither.
  if (!usePostOffice) {
    body.rate_type = request.rateType;
    body.box_id = request.boxId ?? 1;
  }

  try {
    const response = await fetch(usePostOffice ? POST_OFFICE_PRICE_URL : PRICE_URL, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const parsed = responseSchema.safeParse(await response.json());
    // Tapin reports success as status 20 in `returns`, not through the HTTP code alone.
    if (!parsed.success || parsed.data.returns.status !== 20) return null;
    const { send_price: sendPrice, tax = 0, total } = parsed.data.entries;
    return { total, sendPrice, tax };
  } catch {
    return null;
  }
}
