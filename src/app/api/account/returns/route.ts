import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { MediaStorageUnavailableError } from "@/modules/media/ftp-storage";
import { ReturnAttachmentValidationError, rollbackReturnFiles, uploadReturnFiles, validateReturnFiles, type UploadedReturnFile } from "@/modules/orders/return-attachments";
import { createReturnRequest, returnRequestSchema, ReturnStatusError } from "@/modules/orders/returns";

export async function POST(request: Request) {
  let uploaded: UploadedReturnFile[] = [];
  try {
    const user = await getCurrentUser();
    if (!user || user.isGuest) return NextResponse.json({ message: "برای ثبت درخواست مرجوعی وارد حساب شوید." }, { status: 401 });

    const form = await request.formData();
    const files = form.getAll("file").filter((item): item is File => item instanceof File && item.size > 0);
    let items: unknown;
    try {
      items = JSON.parse(String(form.get("items") ?? "[]"));
    } catch {
      return NextResponse.json({ message: "اطلاعات درخواست مرجوعی معتبر نیست." }, { status: 422 });
    }
    const parsed = returnRequestSchema.safeParse({
      orderId: String(form.get("orderId") ?? ""),
      reason: String(form.get("reason") ?? ""),
      items,
    });
    if (!parsed.success) return NextResponse.json({ message: "اطلاعات درخواست مرجوعی معتبر نیست." }, { status: 422 });

    validateReturnFiles(files);
    uploaded = await uploadReturnFiles(files);

    const created = await createReturnRequest(parsed.data, user.id, uploaded);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    await rollbackReturnFiles(uploaded);
    if (error instanceof ReturnAttachmentValidationError) return NextResponse.json({ message: error.message }, { status: 422 });
    if (error instanceof MediaStorageUnavailableError) return NextResponse.json({ message: "بارگذاری فایل موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید." }, { status: 503 });
    if (error instanceof ReturnStatusError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    return apiError(error);
  }
}
