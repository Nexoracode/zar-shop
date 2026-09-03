import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { pruneExpired } from "@/modules/notifications/service";

export async function GET(request: Request) {
  if (!env.CRON_SECRET) return NextResponse.json({ message: "کلید اجرای زمان‌بندی تنظیم نشده است." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
  return NextResponse.json({ pruned: await pruneExpired(db, { take: 1000 }) });
}
