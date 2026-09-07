import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { PaymentProviderError } from "@/modules/payments/payment-provider";
import { walletTopupSchema } from "@/modules/wallet/schemas";
import { startWalletTopup, WalletTopupError } from "@/modules/wallet/topup";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.isGuest) return NextResponse.json({ message: "برای افزایش اعتبار ابتدا وارد حساب شوید." }, { status: 401 });
    const input = walletTopupSchema.parse(await request.json());
    const result = await startWalletTopup({
      userId: user.id,
      amount: input.amount,
      paymentProvider: input.paymentProvider,
      mobile: user.phone,
      email: user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WalletTopupError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    if (error instanceof PaymentProviderError) return NextResponse.json({ message: "ارتباط با درگاه پرداخت برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید." }, { status: 502 });
    return apiError(error);
  }
}
