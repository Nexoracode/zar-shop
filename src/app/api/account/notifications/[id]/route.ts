import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { notificationPatchSchema } from "@/modules/notifications/schemas";
import { dismiss, markRead, unreadCount } from "@/modules/notifications/service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    const input = notificationPatchSchema.parse(await request.json());
    if (!input.dismissed && !input.read) return NextResponse.json({ message: "عملیات نامشخص است." }, { status: 400 });
    const ok = input.dismissed
      ? await dismiss(db, user.id, user.createdAt, id)
      : await markRead(db, user.id, user.createdAt, id);
    if (!ok) return NextResponse.json({ message: "اعلان پیدا نشد." }, { status: 404 });
    return NextResponse.json({ ok: true, unread: await unreadCount(db, user.id, user.createdAt) });
  } catch (error) {
    return apiError(error);
  }
}
