/*
 * What the storefront needs to let someone pick a combination: the types in order, the values
 * each offers, and which pairings can actually be bought.
 *
 * The browser never computes a selection key — it sends the labels it was shown and the cart
 * endpoint resolves them, so the hash stays in one place.
 */

type OptionTypeRow = {
  position: number;
  type: { name: string; kind: "SELECT" | "COLOR" };
  values: Array<{ position: number; value: { id: string; label: string; colorId: string | null } }>;
};

export type SelectableType = {
  name: string;
  kind: "SELECT" | "COLOR";
  values: Array<{ label: string; colorId: string | null }>;
};

/** The pickers to render, in the order the admin arranged them. */
export function selectableTypes(optionTypes: OptionTypeRow[]): SelectableType[] {
  return [...optionTypes]
    .sort((left, right) => left.position - right.position)
    .map((row) => ({
      name: row.type.name,
      kind: row.type.kind,
      values: [...row.values]
        .sort((left, right) => left.position - right.position)
        .map((entry) => ({ label: entry.value.label, colorId: entry.value.colorId })),
    }))
    .filter((type) => type.values.length > 0);
}

/** The colours a product is offered in, for the catalogue's colour filter and its swatches. */
export function productColorIds(optionTypes: OptionTypeRow[]) {
  return [...new Set(optionTypes.flatMap((row) => row.values.flatMap((entry) => (entry.value.colorId ? [entry.value.colorId] : []))))];
}

/** Prisma include that fills `OptionTypeRow`, so every caller asks for the same shape. */
export const productOptionTypeInclude = {
  orderBy: { position: "asc" },
  include: {
    type: { select: { name: true, kind: true } },
    values: { orderBy: { position: "asc" }, include: { value: { select: { id: true, label: true, colorId: true } } } },
  },
} as const;
