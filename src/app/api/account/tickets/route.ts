import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { createTicketSchema } from "@/modules/tickets/schemas";
import { createTicket, listForUser, TicketValidationError } from "@/modules/tickets/service";
import { serializeTicketSummary } from "@/modules/tickets/admin";
import { rollbackTicketFiles, TicketAttachmentValidationError, uploadTicketFiles, validateTicketFiles, type UploadedTicketFile } from "@/modules/tickets/attachments";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.isGuest) return NextResponse.json({ message: "برای مشاهدهٔ تیکت‌ها وارد حساب شوید." }, { status: 401 });
  const tickets = await listForUser(db, user.id);
  return NextResponse.json({ items: tickets.map(serializeTicketSummary) });
}

export async function POST(request: Request) {
  let uploaded: UploadedTicketFile[] = [];
  try {
    const user = await getCurrentUser();
    if (!user || user.isGuest) return NextResponse.json({ message: "برای ثبت تیکت وارد حساب شوید." }, { status: 401 });

    const form = await request.formData();
    const files = form.getAll("file").filter((item): item is File => item instanceof File && item.size > 0);
    const rawProductId = form.get("productId");
    const rawCategoryId = form.get("categoryId");
    const input = createTicketSchema.parse({
      productId: typeof rawProductId === "string" && rawProductId ? rawProductId : null,
      categoryId: typeof rawCategoryId === "string" && rawCategoryId ? rawCategoryId : null,
      body: String(form.get("body") ?? ""),
    });
    validateTicketFiles(files);
    uploaded = await uploadTicketFiles(files);

    const ticket = await db.$transaction(async (tx) => {
      const created = await createTicket(tx, { userId: user.id, productId: input.productId, categoryId: input.categoryId, body: input.body, attachments: uploaded });
      await tx.auditLog.create({ data: { actorId: user.id, action: "TICKET_CREATE", entityType: "SupportTicket", entityId: created.id, ...auditRequestContext(request, { subject: created.subject }) } });
      return created;
    });
    return NextResponse.json(serializeTicketSummary(ticket), { status: 201 });
  } catch (error) {
    await rollbackTicketFiles(uploaded);
    if (error instanceof TicketValidationError || error instanceof TicketAttachmentValidationError) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }
    return apiError(error);
  }
}
