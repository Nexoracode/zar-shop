import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { productSchema } from "@/modules/products/schemas";

export async function GET() {
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["ADMIN", "OPERATOR"].includes(actor.role)) {
      return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    }
    const input = productSchema.parse(await request.json());
    const product = await db.product.create({ data: input });
    await db.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_CREATE", entityType: "Product", entityId: product.id } });
    return NextResponse.json(product, { status: 201 });
  } catch (error) { return apiError(error); }
}
