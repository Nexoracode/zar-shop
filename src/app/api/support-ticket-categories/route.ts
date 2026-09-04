import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { ticketCategorySchema } from "@/modules/tickets/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET(request: Request) {
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  if (includeInactive) {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  }

  const categories = await db.supportTicketCategory.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ items: categories });
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "tickets:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });

    const input = ticketCategorySchema.parse(await request.json());
    const category = await db.$transaction(async (tx) => {
      const created = await tx.supportTicketCategory.create({ data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "TICKET_CATEGORY_CREATE", entityType: "SupportTicketCategory", entityId: created.id, ...auditRequestContext(request, { name: created.name }) } });
      return created;
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
