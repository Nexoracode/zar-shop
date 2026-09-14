import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { updateAuthorSchema } from "@/modules/authors/schemas";

type Context = { params: Promise<{ id: string }> };

const authorInclude = {
  avatar: { select: { id: true, url: true, alt: true } },
  _count: { select: { articles: true } },
} as const;

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateAuthorSchema.parse(await request.json());

    const current = await db.author.findUnique({ where: { id }, select: { id: true } });
    if (!current) return NextResponse.json({ message: "نویسنده پیدا نشد." }, { status: 404 });

    if (input.avatarMediaId) {
      const avatar = await db.mediaAsset.findUnique({ where: { id: input.avatarMediaId }, select: { type: true, scope: true } });
      if (!avatar || avatar.type !== "IMAGE" || avatar.scope !== "ARTICLE_AUTHOR") return NextResponse.json({ message: "آواتار باید از گالری «نویسندگان» انتخاب شود." }, { status: 422 });
    }

    const author = await db.$transaction(async (tx) => {
      const updated = await tx.author.update({ where: { id }, data: input, include: authorInclude });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "AUTHOR_UPDATE", entityType: "Author", entityId: id, ...auditRequestContext(request, { name: updated.name }) } });
      return updated;
    });
    return NextResponse.json(author);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const author = await db.author.findUnique({ where: { id }, include: { _count: { select: { articles: true } } } });
    if (!author) return NextResponse.json({ message: "نویسنده پیدا نشد." }, { status: 404 });
    if (author._count.articles > 0) {
      return NextResponse.json({ message: "این نویسنده مقاله دارد و قابل حذف نیست." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      await tx.author.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "AUTHOR_DELETE", entityType: "Author", entityId: id, ...auditRequestContext(request, { name: author.name }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
