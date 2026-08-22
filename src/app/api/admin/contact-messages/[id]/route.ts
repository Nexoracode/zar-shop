import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";

const bodySchema = z.object({ isResolved: z.boolean() });
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "orders:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "اطلاعات معتبر نیست." }, { status: 422 });
    const message = await db.$transaction(async (tx) => {
      const updated = await tx.contactMessage.update({ where: { id }, data: { isResolved: parsed.data.isResolved, resolvedAt: parsed.data.isResolved ? new Date() : null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "CONTACT_MESSAGE_UPDATE", entityType: "ContactMessage", entityId: id, ...auditRequestContext(request, { subject: updated.subject, isResolved: updated.isResolved }) } });
      return updated;
    });
    return NextResponse.json(message);
  } catch (error) { return apiError(error); }
}
