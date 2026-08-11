import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { getProductAttributeManagement } from "@/modules/products/attribute-management";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const { id } = await context.params;
  const data = await getProductAttributeManagement(id);
  if (!data) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });
  return NextResponse.json(data);
}
