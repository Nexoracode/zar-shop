import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

const searchQuerySchema = z.string().trim().max(100);

export async function GET(request: Request) {
  try {
    const [settings, user] = await Promise.all([getGeneralStoreSettings(), getCurrentUser()]);
    if (!isStorefrontAvailable(settings, user?.role)) return NextResponse.json({ message: "فروشگاه موقتاً در دسترس نیست." }, { status: 503 });

    const query = searchQuerySchema.parse(new URL(request.url).searchParams.get("q") ?? "");
    const productWhere = {
      status: "ACTIVE" as const,
      storeIndustry: settings.industry,
      ...(query ? { OR: [{ name: { contains: query } }, { sku: { contains: query } }, { slug: { contains: query } }, { category: { name: { contains: query } } }] } : {}),
    };
    const categoryWhere = {
      isActive: true,
      products: { some: { status: "ACTIVE" as const, storeIndustry: settings.industry } },
      ...(query ? { name: { contains: query } } : {}),
    };
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: productWhere,
        select: { id: true, name: true, slug: true, category: { select: { name: true } } },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: query ? 8 : 6,
      }),
      db.category.findMany({
        where: categoryWhere,
        select: { id: true, name: true, slug: true },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
        take: query ? 5 : 8,
      }),
    ]);

    return NextResponse.json({
      query,
      products: products.map((product) => ({ id: product.id, label: product.name, href: `/products/${product.slug}`, category: product.category?.name ?? "محصولات" })),
      categories: categories.map((category) => ({ id: category.id, label: category.name, href: `/products?category=${encodeURIComponent(category.slug)}` })),
      popularTerms: query ? [] : [...new Set([...categories.map((category) => category.name), ...products.map((product) => product.name)])].slice(0, 10),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
