import { db } from "@/lib/db";

type OptionInput = { values: Array<{ colorId: string | null; isActive?: boolean }> };

export async function areOptionColorsValid(options: OptionInput[]) {
  const ids = [...new Set(options.flatMap((option) => option.values.flatMap((item) => item.colorId && item.isActive !== false ? [item.colorId] : [])))];
  if (!ids.length) return true;
  const count = await db.color.count({ where: { id: { in: ids }, isActive: true } });
  return count === ids.length;
}
