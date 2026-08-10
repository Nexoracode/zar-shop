import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";

export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) {
      return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    }

    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 3) return NextResponse.json([]);
    if (query.length > 100) return NextResponse.json({ message: "عبارت جستجو بیش از حد طولانی است." }, { status: 422 });

    const products = await db.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { slug: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        storeIndustry: true,
        stock: true,
        category: { select: { name: true } },
        _count: { select: { options: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    });

    return NextResponse.json(products);
  } catch (error) {
    return apiError(error);
  }
}
