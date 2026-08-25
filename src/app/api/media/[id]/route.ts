import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { deleteStoredMedia, MediaStorageUnavailableError } from "@/modules/media/ftp-storage";
import { hasPermission } from "@/modules/auth/permissions";
import { mediaUsageCount, mediaUsageSelect } from "@/modules/media/usage";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

/** An empty string clears the field; leaving a key out keeps whatever is stored. */
const optionalText = (max: number, message: string) => z.string().trim().max(max, message).optional();

const updateSchema = z.object({
  title: optionalText(191, "عنوان رسانه نباید بیشتر از ۱۹۱ نویسه باشد."),
  alt: optionalText(191, "متن جایگزین نباید بیشتر از ۱۹۱ نویسه باشد."),
  caption: optionalText(300, "کپشن نباید بیشتر از ۳۰۰ نویسه باشد."),
  description: optionalText(5000, "توضیحات نباید بیشتر از ۵۰۰۰ نویسه باشد."),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), "چیزی برای ذخیره وجود ندارد.");

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateSchema.parse(await request.json().catch(() => null));

    const existing = await db.mediaAsset.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ message: "رسانه پیدا نشد." }, { status: 404 });

    // A blank value is a deliberate "clear this", which is not the same as leaving it untouched.
    const data = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, value === "" ? null : value]),
    );

    const updated = await db.$transaction(async (tx) => {
      const media = await tx.mediaAsset.update({ where: { id }, data, include: { _count: { select: mediaUsageSelect } } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "MEDIA_UPDATE",
          entityType: "MediaAsset",
          entityId: id,
          ...auditRequestContext(request, { changedFields: Object.keys(data) }),
        },
      });
      return media;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const media = await db.mediaAsset.findUnique({
      where: { id },
      include: { _count: { select: mediaUsageSelect } },
    });
    if (!media) return NextResponse.json({ message: "رسانه پیدا نشد." }, { status: 404 });
    if (mediaUsageCount(media._count) > 0) {
      return NextResponse.json({ message: "این رسانه در سایت استفاده شده و ابتدا باید از بخش مربوط جدا شود." }, { status: 409 });
    }

    await deleteStoredMedia(media.storageKey, media.url);
    await db.$transaction(async (tx) => {
      await tx.mediaAsset.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "MEDIA_DELETE", entityType: "MediaAsset", entityId: id, ...auditRequestContext(request, { scope: media.scope, storageKey: media.storageKey, title: media.title, mimeType: media.mimeType }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof MediaStorageUnavailableError) {
      console.error("Media storage is unavailable", error.cause ?? error);
      return NextResponse.json({ message: "فضای ذخیره‌سازی موقتاً در دسترس نیست و فایل حذف نشد." }, { status: 503 });
    }
    return apiError(error);
  }
}
