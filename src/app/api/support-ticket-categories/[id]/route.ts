import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { updateTicketCategorySchema } from "@/modules/tickets/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateTicketCategorySchema.parse(await request.json());

    const current = await db.supportTicketCategory.findUnique({ where: { id }, select: { id: true } });
    if (!current) return NextResponse.json({ message: "موضوع تیکت پیدا نشد." }, { status: 404 });

    const category = await db.$transaction(async (tx) => {
      const updated = await tx.supportTicketCategory.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "TICKET_CATEGORY_UPDATE", entityType: "SupportTicketCategory", entityId: id, ...auditRequestContext(request, { name: updated.name }) } });
      return updated;
    });
    return NextResponse.json(category);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const category = await db.supportTicketCategory.findUnique({ where: { id }, include: { _count: { select: { tickets: true } } } });
    if (!category) return NextResponse.json({ message: "موضوع تیکت پیدا نشد." }, { status: 404 });
    if (category._count.tickets > 0) {
      return NextResponse.json({ message: "این موضوع دارای تیکت است و قابل حذف نیست." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      await tx.supportTicketCategory.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "TICKET_CATEGORY_DELETE", entityType: "SupportTicketCategory", entityId: id, ...auditRequestContext(request, { name: category.name }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
