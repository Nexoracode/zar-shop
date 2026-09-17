import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

export type CategoryTreeGrandchild = { id: string; name: string; slug: string };
export type CategoryTreeChild = { id: string; name: string; slug: string; children: CategoryTreeGrandchild[] };
export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  image: { url: string; alt: string | null; type: string } | null;
  children: CategoryTreeChild[];
};

// Three-level category tree (top-level -> children -> grandchildren), shared by the desktop
// mega-menu (GeneralCategoryMegaMenu) and the mobile /categories browser so both read the exact
// same shape from one query instead of drifting apart. Cached across requests — this is read on
// nearly every storefront page view via the header. No admin-side revalidateTag is wired yet for
// category create/edit/delete, so a short cacheLife keeps that staleness window small until it
// self-heals; wiring explicit invalidation is a follow-up.
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("categories:tree");
  return db.category.findMany({
    where: { isActive: true, parentId: null },
    select: {
      id: true,
      name: true,
      slug: true,
      image: { select: { url: true, alt: true, type: true } },
      children: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          children: { where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
