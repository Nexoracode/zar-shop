import { db } from "@/lib/db";
import type { OptionTypeInput } from "@/modules/options/schemas";

/*
 * Reading and writing the shared variant library.
 *
 * A type's values are replaced as a set on save, but rows that keep their id are updated rather
 * than recreated — a value a product already offers must not lose its identity because the admin
 * renamed a sibling.
 */

export type OptionTypeRecord = Awaited<ReturnType<typeof listOptionTypes>>[number];

const typeInclude = {
  values: {
    orderBy: [{ sortOrder: "asc" as const }, { label: "asc" as const }],
    include: { color: { select: { id: true, name: true, hex: true } } },
  },
  _count: { select: { products: true } },
};

export function listOptionTypes() {
  return db.optionType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: typeInclude });
}

export function getOptionType(id: string) {
  return db.optionType.findUnique({ where: { id }, include: typeInclude });
}

/** The library as the product form needs it: active types and their active values only. */
export async function listSelectableOptionTypes() {
  const types = await db.optionType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      values: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: { id: true, label: true, colorId: true, color: { select: { id: true, name: true, hex: true } } },
      },
    },
  });
  return types.map((type) => ({
    id: type.id,
    name: type.name,
    kind: type.kind,
    values: type.values.map((value) => ({ id: value.id, label: value.label, colorId: value.colorId, color: value.color })),
  }));
}

export function createOptionType(input: OptionTypeInput) {
  return db.optionType.create({
    data: {
      name: input.name,
      kind: input.kind,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      values: {
        create: input.values.map((value, sortOrder) => ({
          label: value.label,
          colorId: input.kind === "COLOR" ? value.colorId : null,
          isActive: value.isActive,
          sortOrder,
        })),
      },
    },
    include: typeInclude,
  });
}

export async function updateOptionType(id: string, input: OptionTypeInput) {
  return db.$transaction(async (tx) => {
    const keptIds = input.values.flatMap((value) => (value.id ? [value.id] : []));
    // Dropping a value the admin removed also removes it from every product that offered it —
    // the cascade on `ProductOptionValue` is what keeps a product from advertising a value the
    // library no longer defines.
    await tx.optionValue.deleteMany({ where: { typeId: id, ...(keptIds.length ? { id: { notIn: keptIds } } : {}) } });

    for (const [sortOrder, value] of input.values.entries()) {
      const data = {
        label: value.label,
        colorId: input.kind === "COLOR" ? value.colorId : null,
        isActive: value.isActive,
        sortOrder,
      };
      if (value.id) await tx.optionValue.update({ where: { id: value.id }, data });
      else await tx.optionValue.create({ data: { ...data, typeId: id } });
    }

    return tx.optionType.update({
      where: { id },
      data: { name: input.name, kind: input.kind, isActive: input.isActive, sortOrder: input.sortOrder },
      include: typeInclude,
    });
  });
}
