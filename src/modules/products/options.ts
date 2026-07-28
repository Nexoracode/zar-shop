import { createHash } from "node:crypto";

type ProductOptionLike = { id: string; name: string; values: unknown };

export type ProductOptionValue = { value: string; colorId: string | null };

export function parseOptionValues(values: unknown): ProductOptionValue[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((item) => {
    if (typeof item === "string") return [{ value: item, colorId: null }];
    if (!item || typeof item !== "object" || !("value" in item) || typeof item.value !== "string") return [];
    return [{ value: item.value, colorId: "colorId" in item && typeof item.colorId === "string" ? item.colorId : null }];
  });
}

function optionValues(option: ProductOptionLike) {
  return parseOptionValues(option.values).map((item) => item.value);
}

export function resolveOptionSelection(options: ProductOptionLike[], selected: Record<string, string>) {
  if (!options.length) return { ok: true as const, selectionKey: "", snapshot: null };
  const snapshot: Record<string, string> = {};
  for (const option of options) {
    const value = selected[option.id];
    if (!value || !optionValues(option).includes(value)) return { ok: false as const, optionName: option.name };
    snapshot[option.name] = value;
  }
  const serialized = JSON.stringify(snapshot);
  return { ok: true as const, selectionKey: createHash("sha256").update(serialized).digest("hex"), snapshot };
}

export function isOptionSnapshotValid(options: ProductOptionLike[], snapshot: unknown) {
  if (!options.length) return snapshot === null || optionEntries(snapshot).length === 0;
  const selected = Object.fromEntries(optionEntries(snapshot));
  return options.every((option) => {
    const value = selected[option.name];
    return Boolean(value && optionValues(option).includes(value));
  });
}

export function optionEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string");
}
