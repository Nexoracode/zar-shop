import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { MediaScope } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { deleteStoredMedia, MediaStorageUnavailableError, uploadMediaToFtp } from "@/modules/media/ftp-storage";

const MAX_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 10;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "application/pdf": ".pdf",
};

function parseScope(value: string | null): MediaScope | null {
  return value === "CATEGORY" || value === "PRODUCT" || value === "HOMEPAGE" ? value : null;
}

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const rawScope = params.get("scope");
  const scope = parseScope(rawScope);
  if (rawScope && !scope) return NextResponse.json({ message: "بخش گالری معتبر نیست." }, { status: 422 });
  const requestedLimit = Number(params.get("limit") ?? 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 200) : 100;
  const items = await db.mediaAsset.findMany({
    where: scope ? { scope } : undefined,
    include: { _count: { select: { products: true, optionGuideProducts: true, categories: true, homepageHeroDesktop: true, homepageHeroMobile: true } } },
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
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const form = await request.formData();
    const files = form.getAll("file").filter((item): item is File => item instanceof File && item.size > 0);
    const scope = parseScope(String(form.get("scope") ?? ""));
    if (!files.length) return NextResponse.json({ message: "فایلی انتخاب نشده است." }, { status: 400 });
    if (!scope) return NextResponse.json({ message: "بخش گالری مشخص نشده است." }, { status: 422 });
    if (files.length > MAX_FILES) return NextResponse.json({ message: `در هر بار حداکثر ${MAX_FILES.toLocaleString("fa-IR")} فایل قابل بارگذاری است.` }, { status: 422 });
    if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_SIZE) return NextResponse.json({ message: "حجم مجموع فایل‌ها نباید بیشتر از ۱۰۰ مگابایت باشد." }, { status: 422 });
    if (files.some((file) => !EXTENSIONS[file.type] || file.size > MAX_SIZE || (scope !== "PRODUCT" && !file.type.startsWith("image/")))) {
      return NextResponse.json({ message: "نوع یا حجم فایل برای این بخش مجاز نیست." }, { status: 422 });
    }

    const folder = scope === "CATEGORY" ? "categories" : scope === "HOMEPAGE" ? "homepage" : "products";
    const uploaded: Array<{ file: File; storageKey: string; url: string }> = [];
    try {
      for (const file of files) {
        const storageKey = `zar-shop/${folder}/${randomUUID()}${EXTENSIONS[file.type]}`;
        const url = await uploadMediaToFtp(Buffer.from(await file.arrayBuffer()), storageKey);
        uploaded.push({ file, storageKey, url });
      }
      const title = typeof form.get("title") === "string" ? String(form.get("title")).trim() : "";
      const alt = typeof form.get("alt") === "string" && String(form.get("alt")).trim() ? String(form.get("alt")).trim() : null;
      const media = await db.$transaction(async (tx) => {
        const createdItems = [];
        for (const [index, item] of uploaded.entries()) {
          const created = await tx.mediaAsset.create({
            data: {
              type: item.file.type === "application/pdf" ? "DOCUMENT" : item.file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
              scope,
              url: item.url,
              storageKey: item.storageKey,
              title: title ? (uploaded.length > 1 ? `${title} ${(index + 1).toLocaleString("fa-IR")}` : title) : item.file.name,
              alt,
              mimeType: item.file.type,
              sizeBytes: item.file.size,
            },
          });
          await tx.auditLog.create({ data: { actorId: actor.id, action: "MEDIA_UPLOAD", entityType: "MediaAsset", entityId: created.id, metadata: { scope, storageKey: item.storageKey } } });
          createdItems.push(created);
        }
        return createdItems;
      });
      return NextResponse.json({ items: media }, { status: 201 });
    } catch (error) {
      await Promise.all(uploaded.map((item) => deleteStoredMedia(item.storageKey, item.url).catch(() => undefined)));
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
