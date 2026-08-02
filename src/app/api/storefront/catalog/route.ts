import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { collectCategoryAndDescendantIds } from "@/modules/categories/category-tree";
import { getStorefrontCatalog } from "@/modules/products/storefront-catalog";
import { storefrontCatalogQuerySchema } from "@/modules/products/storefront-catalog-contract";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const [settings, user] = await Promise.all([getGeneralStoreSettings(), getCurrentUser()]);
    if (!isStorefrontAvailable(settings, user?.role)) return NextResponse.json({ message: "فروشگاه موقتاً در دسترس نیست." }, { status: 503 });

    const params = new URL(request.url).searchParams;
    const query = storefrontCatalogQuerySchema.parse({
      sortby: params.get("sortby") ?? undefined,
      MinPrice: params.get("MinPrice"),
      MaxPrice: params.get("MaxPrice"),
      category: params.get("category") ?? undefined,
      page: params.get("page") ?? undefined,
    });
    const categories = query.category ? await db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }) : [];
    const selectedCategory = query.category ? categories.find((category) => category.slug === query.category) : null;
    if (query.category && !selectedCategory) return NextResponse.json({ message: "دسته‌بندی پیدا نشد." }, { status: 404 });
    const categoryIds = selectedCategory ? collectCategoryAndDescendantIds(selectedCategory.id, categories) : undefined;
    return NextResponse.json(await getStorefrontCatalog(query, categoryIds), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
