import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { optionEntries } from "@/modules/products/options";

export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "orders:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const productId = new URL(request.url).searchParams.get("productId")?.trim() ?? "";
    if (!productId) return NextResponse.json({ message: "شناسهٔ محصول لازم است." }, { status: 422 });

    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true, name: true, sku: true, status: true, storeIndustry: true, stock: true,
        variants: { where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { selectionKey: true, selection: true, stock: true } },
      },
    });
    if (!product) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });

    return NextResponse.json({
      id: product.id,
      name: product.name,
      sku: product.sku,
      status: product.status,
      storeIndustry: product.storeIndustry,
      stock: product.stock,
      variants: product.variants.map((variant) => ({
        selectionKey: variant.selectionKey,
        label: optionEntries(variant.selection).map(([name, value]) => `${name}: ${value}`).join(" · ") || "بدون عنوان",
        stock: variant.stock,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
