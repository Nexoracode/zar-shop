import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { productSchema } from "@/modules/products/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["ADMIN", "OPERATOR"].includes(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = productSchema.partial().parse(await request.json());
    const product = await db.product.update({ where: { id }, data: input });
    await db.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_UPDATE", entityType: "Product", entityId: id } });
    return NextResponse.json(product);
  } catch (error) { return apiError(error); }
}
