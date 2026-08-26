/**
 * What survives of the old per-option model: reading a stored selection snapshot.
 *
 * A snapshot is `{ "رنگ": "مشکی", "سایز": "XL" }` and is written into `CartItem` and `OrderItem`
 * at the moment of purchase. Orders keep theirs for good, so this has to keep parsing them long
 * after the product's own combinations have changed. Everything else about variants lives in
 * `variants.ts`.
 */
export function optionEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string");
}
