import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { getPermittedActor } from "@/modules/auth/session";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";
import { storefrontIdentityInputSchema } from "@/modules/settings/storefront-identity";

export async function PATCH(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = storefrontIdentityInputSchema.parse(await request.json());
    if (input.mainLogoMediaId) {
      const media = await db.mediaAsset.findFirst({ where: { id: input.mainLogoMediaId, scope: "BRAND", type: "IMAGE" }, select: { id: true } });
      if (!media) return NextResponse.json({ message: "لوگوی انتخاب‌شده معتبر نیست." }, { status: 422 });
    }
    await db.$transaction(async (transaction) => {
      await transaction.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        create: { id: STORE_SETTING_ID, ...input },
        update: input,
      });
      await transaction.auditLog.create({
        data: { actorId: actor.id, action: "STOREFRONT_IDENTITY_UPDATE", entityType: "StoreSetting", entityId: STORE_SETTING_ID, ...auditRequestContext(request, { changedFields: Object.keys(input) }) },
      });
    });
    // { expire: 0 } because the name/tagline and the logo are cached under different tags and the admin
    // must see their own save immediately.
    revalidateTag("settings:general", { expire: 0 });
    revalidateTag("settings:brand", { expire: 0 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
