import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { getProductOptionManagement } from "@/modules/products/option-management";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) {
      return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    }

    const { id } = await context.params;
    const data = await getProductOptionManagement(id);
    if (!data) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}
