import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { contentSettingsSchema, getContentSettings, sanitizeContentSettings } from "@/modules/settings/content-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";
import { revalidateSitemap } from "@/modules/seo/revalidate";

export async function GET() {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getContentSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = contentSettingsSchema.parse(sanitizeContentSettings(contentSettingsSchema.parse(await request.json())));
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, faqItems: input.faqs, contentPages: input.pages },
        update: { faqItems: input.faqs, contentPages: input.pages },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "CONTENT_SETTINGS_UPDATE",
          entityType: "StoreSetting",
          entityId: STORE_SETTING_ID,
          ...auditRequestContext(request, { faqCount: input.faqs.length, publishedPages: input.pages.filter((page) => page.published).map((page) => page.id) }),
        },
      });
    });
    revalidateSitemap();
    // { expire: 0 } because the response below re-reads the cached getter immediately.
    revalidateTag("settings:content", { expire: 0 });
    return NextResponse.json(await getContentSettings());
  } catch (error) {
    return apiError(error);
  }
}
