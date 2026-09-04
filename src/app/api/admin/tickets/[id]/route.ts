import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { getTicketForAgent } from "@/modules/tickets/service";
import { serializeTicketDetail } from "@/modules/tickets/admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const ticket = await getTicketForAgent(db, id);
    if (!ticket) return NextResponse.json({ message: "تیکت پیدا نشد." }, { status: 404 });
    return NextResponse.json(serializeTicketDetail(ticket));
  } catch (error) {
    return apiError(error);
  }
}
