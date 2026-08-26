import { db } from "@/lib/db";
import { cartParcelWeight, chargeableWeightGrams, volumetricWeightGrams, type ParcelLine } from "@/modules/shipping/parcel";
import { fetchTapinRate } from "@/modules/shipping/tapin-rates";
import { tableRate, type ZoneRate } from "@/modules/shipping/zone-rates";

/*
 * The one place the rest of the app asks "what does shipping cost". Everything about carriers,
 * fallbacks and price tables stays behind this function, the same way the payment gateway and the
 * gold rate are kept behind theirs — so swapping the rate source later touches this file only.
 */

export type ShippingQuote = {
  methodId: string;
  title: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  /** Where the number came from, so the admin can tell a live rate from a table row. */
  source: "TAPIN" | "TABLE";
};

export type QuoteInput = {
  lines: ParcelLine[];
  /** Cart merchandise total, declared to the carrier for insurance. */
  declaredValue: number;
  destination: { provinceId: string; cityId: string | null };
};

type MethodRow = {
  id: string;
  title: string;
  carrier: string;
  rateType: string | null;
  source: string;
  orderType: number;
  estimatedDays: number;
  zones: Array<{ provinceId: string | null; maxWeightGrams: number; price: unknown }>;
};

/** Weight and dimensions come from the product rows the cart already loaded. */
export type QuoteProduct = {
  shippingWeightGrams: number | null;
  packageLengthCm: number | null;
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  quantity: number;
};

/** Actual against volumetric, per line, since a cart of bulky items bills on volume. */
export function chargeableCartWeight(products: QuoteProduct[], defaultWeightGrams: number) {
  const actual = cartParcelWeight(products, defaultWeightGrams);
  const volumetric = products.reduce(
    (total, item) => total + volumetricWeightGrams(item.packageLengthCm, item.packageWidthCm, item.packageHeightCm) * Math.max(0, item.quantity),
    0,
  );
  return chargeableWeightGrams(actual, volumetric);
}

function toZoneRates(zones: MethodRow["zones"]): ZoneRate[] {
  return zones.map((zone) => ({ provinceId: zone.provinceId, maxWeightGrams: zone.maxWeightGrams, price: Number(zone.price) }));
}

/**
 * Every method the store can actually price for this cart and destination.
 *
 * A method whose live rate fails falls back to its own table; one that can do neither is left
 * out entirely rather than shown at a made-up price. If that empties the list, the caller has to
 * say so — quoting zero would be a promise the store cannot keep.
 */
export async function getShippingQuotes(input: QuoteInput & { weightGrams: number }): Promise<ShippingQuote[]> {
  const [methods, origin, destination] = await Promise.all([
    db.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, carrier: true, rateType: true, source: true, orderType: true, estimatedDays: true, zones: { select: { provinceId: true, maxWeightGrams: true, price: true } } },
    }),
    db.storeSetting.findFirst({ select: { originProvince: { select: { externalId: true } }, originCity: { select: { externalId: true } } } }),
    input.destination.cityId
      ? db.city.findUnique({ where: { id: input.destination.cityId }, select: { externalId: true, province: { select: { externalId: true } } } })
      : null,
  ]);

  const canAskCarrier = Boolean(origin?.originProvince && origin.originCity && destination?.province);
  const quotes: ShippingQuote[] = [];

  for (const method of methods as MethodRow[]) {
    const zones = toZoneRates(method.zones);
    let price: number | null = null;
    let source: ShippingQuote["source"] = "TABLE";

    if (method.source === "TAPIN" && method.rateType && canAskCarrier) {
      const rate = await fetchTapinRate({
        rateType: method.rateType,
        weightGrams: input.weightGrams,
        declaredValue: input.declaredValue,
        orderType: method.orderType,
        from: { provinceCode: origin!.originProvince!.externalId, cityCode: origin!.originCity!.externalId },
        to: { provinceCode: destination!.province.externalId, cityCode: destination!.externalId },
      });
      if (rate) {
        price = rate.total;
        source = "TAPIN";
      }
    }

    // Either the method prices itself from the table, or the carrier could not be reached.
    if (price === null) price = tableRate(zones, input.destination.provinceId, input.weightGrams);
    if (price === null) continue;

    quotes.push({ methodId: method.id, title: method.title, carrier: method.carrier, price, estimatedDays: method.estimatedDays, source });
  }

  return quotes;
}

/**
 * The price for one chosen method, recomputed on the server.
 *
 * The checkout never trusts the figure the browser sends back: it asks again and uses its own
 * answer, so a tampered or simply stale price cannot become the order total.
 */
export async function quoteForMethod(methodId: string, input: QuoteInput & { weightGrams: number }) {
  const quotes = await getShippingQuotes(input);
  return quotes.find((quote) => quote.methodId === methodId) ?? null;
}
