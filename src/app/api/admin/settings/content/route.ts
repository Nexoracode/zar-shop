import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { contentSettingsSchema, getContentSettings, sanitizeContentSettings } from "@/modules/settings/content-settings";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await getContentSettings());
}

export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !isAdminRole(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
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
    return NextResponse.json(await getContentSettings());
  } catch (error) {
    return apiError(error);
  }
}
