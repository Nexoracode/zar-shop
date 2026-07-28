import { createHash } from "node:crypto";

type ProductOptionLike = { id: string; name: string; values: unknown };

function optionValues(option: ProductOptionLike) {
  return Array.isArray(option.values) ? option.values.filter((value): value is string => typeof value === "string") : [];
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
