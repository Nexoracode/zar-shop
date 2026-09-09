import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { bustSeoRulesCache } from "@/modules/seo/rules";
import { revalidateSitemap } from "@/modules/seo/revalidate";
import { seoRedirectDeleteSchema, seoRedirectInputSchema } from "@/modules/seo/url-schema";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await db.seoRedirect.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { fromUrl, toUrl } = seoRedirectInputSchema.parse(await request.json());
    const row = await db.seoRedirect.upsert({ where: { fromUrl }, create: { fromUrl, toUrl }, update: { toUrl } });
    await db.auditLog.create({ data: { actorId: actor.id, action: "SEO_REDIRECT_SET", entityType: "SeoRedirect", entityId: row.id, ...auditRequestContext(request, { fromUrl, toUrl }) } });
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
    const { fromUrl } = seoRedirectDeleteSchema.parse(await request.json());
    await db.seoRedirect.deleteMany({ where: { fromUrl } });
    await db.auditLog.create({ data: { actorId: actor.id, action: "SEO_REDIRECT_REMOVE", entityType: "SeoRedirect", entityId: fromUrl, ...auditRequestContext(request, { fromUrl }) } });
    bustSeoRulesCache();
    revalidateSitemap();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
