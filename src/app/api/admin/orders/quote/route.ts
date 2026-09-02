import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { ManualOrderError, manualOrderQuoteSchema, priceManualOrder } from "@/modules/orders/manual-order";

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "orders:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = manualOrderQuoteSchema.parse(await request.json());
    const priced = await priceManualOrder(input);
    return NextResponse.json({
      lines: priced.lines.map((line) => ({
        productId: line.product.id,
        selectionKey: line.entry.selectionKey,
        name: line.product.name,
        quantity: line.entry.quantity,
        originalUnitPrice: line.originalUnitPrice,
        unitPrice: line.unitPrice,
        lineTotal: line.total,
        options: line.selectedOptions ?? null,
      })),
      goldRate: priced.rate,
      subtotal: priced.subtotal,
      productDiscount: priced.productDiscount,
      tax: priced.tax,
      merchandiseAmount: priced.merchandiseAmount,
      shipping: priced.shippingFee,
      shippingMethodTitle: priced.shippingMethodTitle,
      total: priced.total,
    });
  } catch (error) {
    if (error instanceof ManualOrderError) return NextResponse.json({ message: error.message }, { status: 409 });
    return apiError(error);
  }
}
