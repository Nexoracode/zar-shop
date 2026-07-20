import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || !["ADMIN", "OPERATOR"].includes(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json(await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["ADMIN", "OPERATOR"].includes(actor.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "فایلی انتخاب نشده است." }, { status: 400 });
    if (!ALLOWED.has(file.type) || file.size > MAX_SIZE) return NextResponse.json({ message: "نوع یا حجم فایل مجاز نیست." }, { status: 422 });
    const extension = path.extname(file.name).toLowerCase();
    const storageKey = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}${extension}`;
    const target = path.join(process.cwd(), "public", "uploads", storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    const media = await db.mediaAsset.create({
      data: {
        type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        url: `/uploads/${storageKey.replaceAll("\\", "/")}`,
        storageKey,
        title: typeof form.get("title") === "string" ? String(form.get("title")) : file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });
    return NextResponse.json(media, { status: 201 });
  } catch (error) { return apiError(error); }
}
