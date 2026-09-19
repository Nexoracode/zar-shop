import { NextResponse } from "next/server";
import { apiError, getRequestOrigin } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { CardTransferError, submitCardTransferProof } from "@/modules/payments/card-to-card";
import { cardTransferDetailsSchema } from "@/modules/payments/card-to-card-shared";
import { MediaStorageUnavailableError } from "@/modules/media/ftp-storage";

/**
 * Sends the proof of a card-to-card transfer for one of the caller's orders: multipart form data
 * carrying either a `receipt` image or the `sourceCardNumber` + `trackingCode` pair.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user) return NextResponse.json({ message: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });

    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ message: "اطلاعات ارسال‌شده معتبر نیست." }, { status: 422 });
    const receipt = form.get("receipt");
    const receiptFile = receipt instanceof File && receipt.size > 0 ? receipt : null;

    let details = null;
    if (!receiptFile) {
      const parsed = cardTransferDetailsSchema.safeParse({ sourceCardNumber: String(form.get("sourceCardNumber") ?? ""), trackingCode: String(form.get("trackingCode") ?? "") });
      if (!parsed.success) return NextResponse.json({ message: "اطلاعات پرداخت معتبر نیست.", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
      details = parsed.data;
    }

    const result = await submitCardTransferProof({ orderId: id, userId: user.id, origin: getRequestOrigin(request), receipt: receiptFile, details });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CardTransferError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    if (error instanceof MediaStorageUnavailableError) return NextResponse.json({ message: "بارگذاری فایل موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید." }, { status: 503 });
    return apiError(error);
  }
}
