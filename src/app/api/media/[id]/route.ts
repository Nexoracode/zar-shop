import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { deleteStoredMedia, MediaStorageUnavailableError } from "@/modules/media/ftp-storage";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const media = await db.mediaAsset.findUnique({
      where: { id },
      include: { _count: { select: { products: true, optionGuideProducts: true, categories: true, homepageHeroDesktop: true, homepageHeroMobile: true, homepagePromoDesktop: true, homepagePromoMobile: true, brandMainLogo: true, brandDarkLogo: true, brandFavicon: true, brandSocialImage: true } } },
    });
    if (!media) return NextResponse.json({ message: "رسانه پیدا نشد." }, { status: 404 });
    if (media._count.products > 0 || media._count.optionGuideProducts > 0 || media._count.categories > 0 || media._count.homepageHeroDesktop > 0 || media._count.homepageHeroMobile > 0 || media._count.homepagePromoDesktop > 0 || media._count.homepagePromoMobile > 0 || media._count.brandMainLogo > 0 || media._count.brandDarkLogo > 0 || media._count.brandFavicon > 0 || media._count.brandSocialImage > 0) {
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
