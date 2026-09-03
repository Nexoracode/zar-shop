import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { notificationListQuerySchema } from "@/modules/notifications/schemas";
import { listForUser, markAllRead, unreadCount } from "@/modules/notifications/service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.isGuest) return NextResponse.json({ message: "برای مشاهدهٔ اعلان‌ها وارد حساب شوید." }, { status: 401 });
    const { limit } = notificationListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const [items, unread] = await Promise.all([
      listForUser(db, user.id, { limit, joinedAt: user.createdAt }),
      unreadCount(db, user.id, user.createdAt),
    ]);
    return NextResponse.json({ items, unread });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.isGuest) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    await markAllRead(db, user.id, user.createdAt);
    return NextResponse.json({ unread: 0 });
  } catch (error) {
    return apiError(error);
  }
}
