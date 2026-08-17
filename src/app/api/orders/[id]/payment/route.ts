import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { PaymentProviderError } from "@/modules/payments/payment-provider";
import { storefrontPaymentMethodSchema } from "@/modules/payments/storefront-methods";
import { PendingOrderPaymentError, startPendingOrderPayment } from "@/modules/payments/start-order-payment";

const bodySchema = z.object({ paymentProvider: storefrontPaymentMethodSchema });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const [user, { id }, body] = await Promise.all([getCurrentUser(), context.params, request.json().catch(() => null)]);
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "روش پرداخت معتبر نیست." }, { status: 422 });
    return NextResponse.json(await startPendingOrderPayment({ orderId: id, userId: user.id, paymentProvider: parsed.data.paymentProvider }));
  } catch (error) {
    if (error instanceof PendingOrderPaymentError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    if (error instanceof PaymentProviderError) return NextResponse.json({ message: "ارتباط با درگاه پرداخت برقرار نشد؛ لطفاً چند لحظه بعد دوباره تلاش کنید." }, { status: 502 });
    return apiError(error);
  }
}
