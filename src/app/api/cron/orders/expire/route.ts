import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { expirePendingOrders } from "@/modules/orders/expiration";

export async function GET(request: Request) {
  if (!env.CRON_SECRET) return NextResponse.json({ message: "کلید اجرای زمان‌بندی تنظیم نشده است." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
  return NextResponse.json(await expirePendingOrders());
}
