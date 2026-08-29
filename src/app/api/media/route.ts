import { NextResponse } from "next/server";
import { z } from "zod";
import type { MediaScope, MediaType } from "@generated/prisma/enums";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { deleteStoredMedia, MediaStorageUnavailableError, uploadMediaToFtp } from "@/modules/media/ftp-storage";
import { mediaFileSlug } from "@/modules/media/filename";
import { mediaUsageSelect } from "@/modules/media/usage";
import { auditRequestContext } from "@/modules/audit/request-context";
import { normalizeSearchText } from "@/lib/text-search";
import { mediaFieldLimits } from "@/modules/media/limits";

const MAX_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 10;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "application/pdf": ".pdf",
};

function parseScope(value: string | null): MediaScope | null {
  return value === "CATEGORY" || value === "PRODUCT" || value === "HOMEPAGE" || value === "BRAND" || value === "PRODUCT_BRAND" ? value : null;
}

function parseType(value: string | null): MediaType | null {
  return value === "IMAGE" || value === "VIDEO" || value === "DOCUMENT" ? value : null;
}

/**
 * MySQL's `contains` does not fold Arabic and Persian letters, so a library entry titled with a
 * Persian yeh is invisible to a search typed with an Arabic one. Searching for both spellings of
 * the two characters that actually differ covers it without a second stored column.
 */
function searchVariants(term: string) {
  const normalized = normalizeSearchText(term);
  const variants = new Set<string>([term.trim(), normalized]);
  variants.add(normalized.replace(/ی/g, "ي"));
  variants.add(normalized.replace(/ک/g, "ك"));
  return [...variants].filter(Boolean);
}

const uploadMetaSchema = z.array(z.object({
  title: z.string().trim().max(mediaFieldLimits.title, "عنوان رسانه نباید بیشتر از ۱۹۱ نویسه باشد.").optional(),
  alt: z.string().trim().max(mediaFieldLimits.alt, "متن جایگزین نباید بیشتر از ۱۹۱ نویسه باشد.").optional(),
  caption: z.string().trim().max(mediaFieldLimits.caption, "کپشن نباید بیشتر از ۳۰۰ نویسه باشد.").optional(),
  width: z.coerce.number().int().positive().max(30000).optional(),
  height: z.coerce.number().int().positive().max(30000).optional(),
})).max(MAX_FILES);

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const params = new URL(request.url).searchParams;

  const rawScope = params.get("scope");
  const scope = parseScope(rawScope);
  if (rawScope && !scope) return NextResponse.json({ message: "بخش گالری معتبر نیست." }, { status: 422 });
  const rawType = params.get("type");
  const type = parseType(rawType);
  if (rawType && !type) return NextResponse.json({ message: "نوع فایل معتبر نیست." }, { status: 422 });

  const query = params.get("q")?.trim() ?? "";
  const missingAlt = params.get("missingAlt") === "1";
  const requestedPage = Math.max(1, Math.trunc(Number(params.get("page") ?? 1)) || 1);
  const requestedPageSize = Math.trunc(Number(params.get("pageSize") ?? 48)) || 48;
  const pageSize = Math.min(Math.max(requestedPageSize, 1), 100);

  const where: Prisma.MediaAssetWhereInput = {
    ...(scope ? { scope } : {}),
    ...(type ? { type } : {}),
    ...(missingAlt ? { OR: [{ alt: null }, { alt: "" }] } : {}),
    ...(query ? { AND: [{ OR: searchVariants(query).flatMap((term) => [{ title: { contains: term } }, { alt: { contains: term } }]) }] } : {}),
  };

  const totalItems = await db.mediaAsset.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items = await db.mediaAsset.findMany({
    where,
    include: { _count: { select: mediaUsageSelect } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({
    items: items.map((item) => ({ ...item, title: item.title ?? item.storageKey.split("/").at(-1) ?? "رسانه" })),
    page,
    pageSize,
    totalItems,
    totalPages,
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
    if (files.some((file) => !EXTENSIONS[file.type] || file.size > MAX_SIZE || ((scope === "CATEGORY" || scope === "BRAND" || scope === "PRODUCT_BRAND") && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) || (scope === "HOMEPAGE" && !file.type.startsWith("image/")))) {
      return NextResponse.json({ message: "نوع یا حجم فایل برای این بخش مجاز نیست." }, { status: 422 });
    }

    /*
     * `meta` carries one entry per file, in the same order, so each upload can have its own alt
     * text. The older single `title`/`alt` pair is still honoured when `meta` is absent, so any
     * caller that has not been updated keeps working.
     */
    const rawMeta = form.get("meta");
    const meta = typeof rawMeta === "string" && rawMeta ? uploadMetaSchema.parse(JSON.parse(rawMeta)) : [];
    const sharedTitle = typeof form.get("title") === "string" ? String(form.get("title")).trim() : "";
    const sharedAlt = typeof form.get("alt") === "string" && String(form.get("alt")).trim() ? String(form.get("alt")).trim() : null;

    const folder = scope === "CATEGORY" ? "categories" : scope === "HOMEPAGE" ? "homepage" : scope === "BRAND" ? "brand" : scope === "PRODUCT_BRAND" ? "product-brands" : "products";
    const uploaded: Array<{ file: File; storageKey: string; url: string }> = [];
    try {
      for (const file of files) {
        const storageKey = `zar-shop/${folder}/${mediaFileSlug(file.name, EXTENSIONS[file.type])}`;
        const url = await uploadMediaToFtp(Buffer.from(await file.arrayBuffer()), storageKey);
        uploaded.push({ file, storageKey, url });
      }
      const media = await db.$transaction(async (tx) => {
        const createdItems = [];
        for (const [index, item] of uploaded.entries()) {
          const entry = meta[index];
          const fallbackTitle = sharedTitle ? (uploaded.length > 1 ? `${sharedTitle} ${(index + 1).toLocaleString("fa-IR")}` : sharedTitle) : item.file.name;
          const created = await tx.mediaAsset.create({
            data: {
              type: item.file.type === "application/pdf" ? "DOCUMENT" : item.file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
              scope,
              url: item.url,
              storageKey: item.storageKey,
              title: entry?.title || fallbackTitle,
              alt: entry?.alt || sharedAlt,
              caption: entry?.caption || null,
              width: entry?.width ?? null,
              height: entry?.height ?? null,
              mimeType: item.file.type,
              sizeBytes: item.file.size,
            },
          });
          await tx.auditLog.create({ data: { actorId: actor.id, action: "MEDIA_UPLOAD", entityType: "MediaAsset", entityId: created.id, ...auditRequestContext(request, { scope, storageKey: item.storageKey, title: created.title, mimeType: created.mimeType, sizeBytes: created.sizeBytes }) } });
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
