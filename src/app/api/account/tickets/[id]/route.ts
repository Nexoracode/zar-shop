import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { getTicketForUser } from "@/modules/tickets/service";
import { serializeTicketDetail } from "@/modules/tickets/admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "برای مشاهدهٔ این تیکت وارد حساب شوید." }, { status: 401 });
    const ticket = await getTicketForUser(db, id, user.id);
    if (!ticket) return NextResponse.json({ message: "تیکت پیدا نشد." }, { status: 404 });
    return NextResponse.json(serializeTicketDetail(ticket));
  } catch (error) {
    return apiError(error);
  }
}
