import { db } from "@/lib/db";
import { optionEntries } from "@/modules/products/options";

/**
 * The swatch colour of each choice a set of cart or order lines carries, keyed the way the lines
 * print them — «رنگ: مشکی» — so a line can put a coloured dot before a colour it names. Choices that
 * are not colours (a size) have no entry.
 */
export async function loadOptionColors(selections: unknown[]): Promise<Record<string, string>> {
  const pairs = selections.flatMap((selection) => optionEntries(selection));
  if (!pairs.length) return {};
  const values = await db.optionValue.findMany({
    where: { colorId: { not: null }, label: { in: [...new Set(pairs.map(([, value]) => value))] }, type: { name: { in: [...new Set(pairs.map(([name]) => name))] } } },
    select: { label: true, type: { select: { name: true } }, color: { select: { hex: true } } },
  });
  const hexByKey = new Map<string, string>(values.flatMap((value): Array<[string, string]> => (value.color ? [[`${value.type.name}: ${value.label}`, value.color.hex]] : [])));
  return Object.fromEntries(pairs.flatMap(([name, value]) => {
    const key = `${name}: ${value}`;
    const hex = hexByKey.get(key);
    return hex ? [[key, hex] as const] : [];
  }));
}
