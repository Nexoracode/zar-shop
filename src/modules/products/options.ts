import { createHash } from "node:crypto";

type ProductOptionLike = { id: string; name: string; values: unknown };

export type ProductOptionValue = { value: string; colorId: string | null; isActive: boolean; stock: number | null };

export function parseOptionValues(values: unknown): ProductOptionValue[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((item) => {
    if (typeof item === "string") return [{ value: item, colorId: null, isActive: true, stock: null }];
    if (!item || typeof item !== "object" || !("value" in item) || typeof item.value !== "string") return [];
    return [{
      value: item.value,
      colorId: "colorId" in item && typeof item.colorId === "string" ? item.colorId : null,
      isActive: !("isActive" in item) || item.isActive !== false,
      stock: "stock" in item && typeof item.stock === "number" && Number.isInteger(item.stock) && item.stock >= 0 ? item.stock : null,
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

export function decrementSelectedOptionStocks(options: ProductOptionLike[], snapshot: unknown, quantity: number, fallbackStock: number) {
  const selected = Object.fromEntries(optionEntries(snapshot));
  return options.map((option) => ({
    id: option.id,
    values: parseOptionValues(option.values).map((item) => item.value === selected[option.name]
      ? { ...item, stock: Math.max(0, (item.stock ?? fallbackStock) - quantity) }
      : item),
  }));
}

export function mergeOptionsPreservingHistory(
  existing: Array<{ name: string; values: unknown }>,
  incoming: Array<{ name: string; values: ProductOptionValue[] }>,
) {
  const existingByName = new Map(existing.map((option) => [option.name, parseOptionValues(option.values)]));
  const merged = incoming.map((option) => {
    const previous = existingByName.get(option.name) ?? [];
    const incomingValues = new Set(option.values.map((item) => item.value));
    existingByName.delete(option.name);
    return {
      ...option,
      values: [...option.values, ...previous.filter((item) => !incomingValues.has(item.value)).map((item) => ({ ...item, isActive: false }))],
    };
  });
  for (const [name, values] of existingByName) merged.push({ name, values: values.map((item) => ({ ...item, isActive: false })) });
  return merged;
}

export function optionEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string");
}
