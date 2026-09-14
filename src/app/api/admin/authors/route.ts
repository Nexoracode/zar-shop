import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { authorSchema } from "@/modules/authors/schemas";

const authorInclude = {
  avatar: { select: { id: true, url: true, alt: true } },
  _count: { select: { articles: true } },
} as const;

async function validateAvatar(avatarMediaId?: string | null) {
  if (!avatarMediaId) return null;
  const avatar = await db.mediaAsset.findUnique({ where: { id: avatarMediaId }, select: { type: true, scope: true } });
  if (!avatar || avatar.type !== "IMAGE" || avatar.scope !== "ARTICLE_AUTHOR") return "آواتار باید از گالری «نویسندگان» انتخاب شود.";
  return null;
}

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const authors = await db.author.findMany({ include: authorInclude, orderBy: { name: "asc" } });
  return NextResponse.json({ items: authors });
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = authorSchema.parse(await request.json());
    const avatarError = await validateAvatar(input.avatarMediaId);
    if (avatarError) return NextResponse.json({ message: avatarError }, { status: 422 });

    const author = await db.$transaction(async (tx) => {
      const created = await tx.author.create({ data: input, include: authorInclude });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "AUTHOR_CREATE", entityType: "Author", entityId: created.id, ...auditRequestContext(request, { name: created.name }) } });
      return created;
    });
    return NextResponse.json(author, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
