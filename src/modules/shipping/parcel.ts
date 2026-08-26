/*
 * Parcel arithmetic, deliberately free of any Prisma or network import so it can be unit tested
 * and imported from either side of the app.
 */

export type ParcelLine = {
  /** Packaged weight of one unit, or null when nobody has measured it yet. */
  shippingWeightGrams: number | null;
  quantity: number;
};

/**
 * What the whole cart weighs, in grams.
 *
 * A product with no packaged weight falls back to the store's default rather than counting as
 * zero: a carrier quote for a weightless parcel is wrong in a way nobody notices until the
 * invoice arrives, whereas a default is at least deliberate.
 */
export function cartParcelWeight(lines: ParcelLine[], defaultWeightGrams: number) {
  return lines.reduce((total, line) => {
    const unit = line.shippingWeightGrams && line.shippingWeightGrams > 0 ? line.shippingWeightGrams : defaultWeightGrams;
    return total + unit * Math.max(0, line.quantity);
  }, 0);
}

/**
 * Volumetric weight, the figure carriers bill by when a parcel is bulky but light.
 *
 * The divisor is the usual 6000 for road and post. Returns 0 when any side is missing, so a
 * half-measured parcel falls back to its real weight instead of a number built from guesses.
 */
export function volumetricWeightGrams(lengthCm: number | null, widthCm: number | null, heightCm: number | null, divisor = 6000) {
  if (!lengthCm || !widthCm || !heightCm) return 0;
  return Math.round((lengthCm * widthCm * heightCm / divisor) * 1000);
}

/** Carriers charge on whichever is greater. */
export function chargeableWeightGrams(actualGrams: number, volumetricGrams: number) {
  return Math.max(actualGrams, volumetricGrams);
}
