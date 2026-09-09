import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { bustSeoRulesCache } from "@/modules/seo/rules";
import { revalidateSitemap } from "@/modules/seo/revalidate";
import { seoDeleteByPathSchema, seoGoneInputSchema } from "@/modules/seo/url-schema";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await db.seoGonePage.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { url } = seoGoneInputSchema.parse(await request.json());
    const row = await db.seoGonePage.upsert({ where: { url }, create: { url }, update: {} });
    await db.auditLog.create({ data: { actorId: actor.id, action: "SEO_GONE_ADD", entityType: "SeoGonePage", entityId: row.id, ...auditRequestContext(request, { url }) } });
    bustSeoRulesCache();
    revalidateSitemap();
    return NextResponse.json(row);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { url } = seoDeleteByPathSchema.parse(await request.json());
    await db.seoGonePage.deleteMany({ where: { url } });
    await db.auditLog.create({ data: { actorId: actor.id, action: "SEO_GONE_REMOVE", entityType: "SeoGonePage", entityId: url, ...auditRequestContext(request, { url }) } });
    bustSeoRulesCache();
    revalidateSitemap();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
