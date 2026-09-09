import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { bustSeoRulesCache } from "@/modules/seo/rules";
import { revalidateSitemap } from "@/modules/seo/revalidate";
import { seoCanonicalDeleteSchema, seoCanonicalInputSchema } from "@/modules/seo/url-schema";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await db.seoCanonical.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { sourceUrl, targetUrl } = seoCanonicalInputSchema.parse(await request.json());
    const row = await db.seoCanonical.upsert({ where: { sourceUrl }, create: { sourceUrl, targetUrl }, update: { targetUrl } });
    await db.auditLog.create({ data: { actorId: actor.id, action: "SEO_CANONICAL_SET", entityType: "SeoCanonical", entityId: row.id, ...auditRequestContext(request, { sourceUrl, targetUrl }) } });
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
    const { sourceUrl } = seoCanonicalDeleteSchema.parse(await request.json());
    await db.seoCanonical.deleteMany({ where: { sourceUrl } });
    await db.auditLog.create({ data: { actorId: actor.id, action: "SEO_CANONICAL_REMOVE", entityType: "SeoCanonical", entityId: sourceUrl, ...auditRequestContext(request, { sourceUrl }) } });
    bustSeoRulesCache();
    revalidateSitemap();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
