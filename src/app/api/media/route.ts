import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { MediaScope } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { MediaStorageUnavailableError, uploadMediaToFtp } from "@/modules/media/ftp-storage";

const MAX_SIZE = 25 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

function isManager(role: string | undefined) {
  return role === "ADMIN" || role === "OPERATOR";
}

function parseScope(value: string | null): MediaScope | null {
  return value === "CATEGORY" || value === "PRODUCT" ? value : null;
}

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!isManager(actor?.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const rawScope = params.get("scope");
  const scope = parseScope(rawScope);
  if (rawScope && !scope) return NextResponse.json({ message: "بخش گالری معتبر نیست." }, { status: 422 });
  const requestedLimit = Number(params.get("limit") ?? 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 200) : 100;
  const items = await db.mediaAsset.findMany({
    where: scope ? { scope } : undefined,
    include: { _count: { select: { products: true, categories: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({
    items: items.map((item) => ({ ...item, title: item.title ?? item.storageKey.split("/").at(-1) ?? "رسانه" })),
  });
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!isManager(actor?.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const form = await request.formData();
    const file = form.get("file");
    const scope = parseScope(String(form.get("scope") ?? ""));
    if (!(file instanceof File)) return NextResponse.json({ message: "فایلی انتخاب نشده است." }, { status: 400 });
    if (!scope) return NextResponse.json({ message: "بخش گالری مشخص نشده است." }, { status: 422 });
    const extension = EXTENSIONS[file.type];
    if (!extension || file.size > MAX_SIZE || (scope === "CATEGORY" && !file.type.startsWith("image/"))) {
      return NextResponse.json({ message: "نوع یا حجم فایل برای این بخش مجاز نیست." }, { status: 422 });
    }

    const folder = scope === "CATEGORY" ? "categories" : "products";
    const storageKey = `zar-shop/${folder}/${randomUUID()}${extension}`;
    const url = await uploadMediaToFtp(Buffer.from(await file.arrayBuffer()), storageKey);
    try {
      const media = await db.$transaction(async (tx) => {
        const created = await tx.mediaAsset.create({
          data: {
            type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
            scope,
            url,
            storageKey,
            title: typeof form.get("title") === "string" && String(form.get("title")).trim() ? String(form.get("title")).trim() : file.name,
            alt: typeof form.get("alt") === "string" && String(form.get("alt")).trim() ? String(form.get("alt")).trim() : null,
            mimeType: file.type,
            sizeBytes: file.size,
          },
        });
        await tx.auditLog.create({ data: { actorId: actor!.id, action: "MEDIA_UPLOAD", entityType: "MediaAsset", entityId: created.id, metadata: { scope, storageKey } } });
        return created;
      });
      return NextResponse.json(media, { status: 201 });
    } catch (error) {
      const { deleteStoredMedia } = await import("@/modules/media/ftp-storage");
      await deleteStoredMedia(storageKey, url).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof MediaStorageUnavailableError) {
      console.error("Media storage is unavailable", error.cause ?? error);
      return NextResponse.json({ message: "فضای ذخیره‌سازی موقتاً در دسترس نیست؛ لطفاً کمی بعد دوباره تلاش کنید." }, { status: 503 });
    }
    return apiError(error);
  }
}
