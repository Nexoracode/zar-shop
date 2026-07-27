import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { deleteStoredMedia, MediaStorageUnavailableError } from "@/modules/media/ftp-storage";
import { hasPermission } from "@/modules/auth/permissions";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const media = await db.mediaAsset.findUnique({
      where: { id },
      include: { _count: { select: { products: true, categories: true } } },
    });
    if (!media) return NextResponse.json({ message: "رسانه پیدا نشد." }, { status: 404 });
    if (media._count.products > 0 || media._count.categories > 0) {
      return NextResponse.json({ message: "این رسانه در محصول یا دسته‌بندی استفاده شده و ابتدا باید از آن بخش حذف شود." }, { status: 409 });
    }

    await deleteStoredMedia(media.storageKey, media.url);
    await db.$transaction(async (tx) => {
      await tx.mediaAsset.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "MEDIA_DELETE", entityType: "MediaAsset", entityId: id, metadata: { scope: media.scope, storageKey: media.storageKey } } });
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
