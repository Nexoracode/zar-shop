import { db } from "@/lib/db";

/** The active categories, for the page builder's category picker (a product list can be about one category). */
export async function getCategoryOptions() {
  return db.category.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }], select: { id: true, name: true } });
}
