import { createHash } from "node:crypto";

type ProductOptionLike = { id: string; name: string; values: unknown };

export type ProductOptionValue = { value: string; colorId: string | null; isActive: boolean; stock: number | null; weightGrams: string | null; price: string | null };

export function parseOptionValues(values: unknown): ProductOptionValue[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((item) => {
    if (typeof item === "string") return [{ value: item, colorId: null, isActive: true, stock: null, weightGrams: null, price: null }];
    if (!item || typeof item !== "object" || !("value" in item) || typeof item.value !== "string") return [];
    return [{
      value: item.value,
      colorId: "colorId" in item && typeof item.colorId === "string" ? item.colorId : null,
      isActive: !("isActive" in item) || item.isActive !== false,
      stock: "stock" in item && typeof item.stock === "number" && Number.isInteger(item.stock) && item.stock >= 0 ? item.stock : null,
      weightGrams: "weightGrams" in item && typeof item.weightGrams === "string" && /^\d{1,7}(\.\d{1,3})?$/.test(item.weightGrams) ? item.weightGrams : null,
      price: "price" in item && typeof item.price === "string" && /^[1-9]\d{0,17}$/.test(item.price) ? item.price : null,
    }];
  });
}

function selectableValue(option: ProductOptionLike, value: string, quantity: number, fallbackStock: number) {
  return parseOptionValues(option.values).find((item) => item.value === value && item.isActive && (item.stock ?? fallbackStock) >= quantity);
}

export function resolveOptionSelection(options: ProductOptionLike[], selected: Record<string, string>, quantity = 1, fallbackStock = 0) {
  const activeOptions = options.filter((option) => parseOptionValues(option.values).some((item) => item.isActive));
  if (!activeOptions.length) return { ok: true as const, selectionKey: "", snapshot: null };
  const snapshot: Record<string, string> = {};
  for (const option of activeOptions) {
    const value = selected[option.id];
    if (!value || !selectableValue(option, value, quantity, fallbackStock)) return { ok: false as const, optionName: option.name };
    snapshot[option.name] = value;
  }
  const serialized = JSON.stringify(snapshot);
  return { ok: true as const, selectionKey: createHash("sha256").update(serialized).digest("hex"), snapshot };
}

export function isOptionSnapshotValid(options: ProductOptionLike[], snapshot: unknown, quantity = 1, fallbackStock = 0) {
  const activeOptions = options.filter((option) => parseOptionValues(option.values).some((item) => item.isActive));
  if (!activeOptions.length) return snapshot === null || optionEntries(snapshot).length === 0;
  const selected = Object.fromEntries(optionEntries(snapshot));
  return activeOptions.every((option) => {
    const value = selected[option.name];
    return Boolean(value && selectableValue(option, value, quantity, fallbackStock));
  });
}

/**
 * Selects the option rows that need their `values` JSON touched for a given selection
 * snapshot, i.e. only the rows whose option name was actually chosen for this order line.
 * Rows unrelated to the selection are left out so callers never write (or version-bump)
 * an option row that didn't change.
 */
export function selectedOptionRows(options: ProductOptionLike[], snapshot: unknown) {
  const selected = Object.fromEntries(optionEntries(snapshot));
  return options
    .filter((option) => option.name in selected)
    .map((option) => ({ id: option.id, targetValue: selected[option.name] }));
}

export function decrementOptionValueStock(option: ProductOptionLike, targetValue: string, quantity: number, fallbackStock: number) {
  const values = parseOptionValues(option.values);
  const target = values.find((item) => item.value === targetValue);
  if (!target || !target.isActive || (target.stock ?? fallbackStock) < quantity) {
    throw new Error("Selected product option is unavailable");
  }
  return values.map((item) => item.value === targetValue
    ? { ...item, stock: Math.max(0, (item.stock ?? fallbackStock) - quantity) }
    : item);
}

export function incrementOptionValueStock(option: ProductOptionLike, targetValue: string, quantity: number) {
  return parseOptionValues(option.values).map((item) => item.value === targetValue && item.stock !== null
    ? { ...item, stock: item.stock + quantity }
    : item);
}

export function getSelectedOptionWeight(options: ProductOptionLike[], snapshot: unknown, fallbackWeight: number | string | { toString(): string }) {
  const selected = Object.fromEntries(optionEntries(snapshot));
  const selectedWeights = options.flatMap((option) => {
    const value = parseOptionValues(option.values).find((item) => item.value === selected[option.name]);
    return value?.weightGrams ? [value.weightGrams] : [];
  });
  return selectedWeights[0] ?? fallbackWeight.toString();
}

export function getSelectedOptionPrice(options: ProductOptionLike[], snapshot: unknown, fallbackPrice: number) {
  const selected = Object.fromEntries(optionEntries(snapshot));
  const selectedPrices = options.flatMap((option) => {
    const value = parseOptionValues(option.values).find((item) => item.value === selected[option.name]);
    return value?.price ? [Number(value.price)] : [];
  });
  return selectedPrices[0] ?? fallbackPrice;
}

export function mergeOptionsPreservingHistory(
  existing: Array<{ name: string; values: unknown }>,
  incoming: Array<{ name: string; values: ProductOptionValue[] }>,
  usedSelectionKeys: Set<string> = new Set(),
) {
  const existingByName = new Map(existing.map((option) => [option.name, parseOptionValues(option.values)]));
  const merged = incoming.map((option) => {
    const previous = existingByName.get(option.name) ?? [];
    const incomingValues = new Set(option.values.map((item) => item.value));
    existingByName.delete(option.name);
    return {
      ...option,
      values: [...option.values, ...previous.filter((item) => !incomingValues.has(item.value) && usedSelectionKeys.has(optionSelectionKey(option.name, item.value))).map((item) => ({ ...item, isActive: false }))],
    };
  });
  for (const [name, values] of existingByName) {
    const usedValues = values.filter((item) => usedSelectionKeys.has(optionSelectionKey(name, item.value)));
    if (usedValues.length) merged.push({ name, values: usedValues.map((item) => ({ ...item, isActive: false })) });
  }
  return merged;
}

export function optionSelectionKey(name: string, value: string) {
  return JSON.stringify([name, value]);
}

export function optionEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string");
}
