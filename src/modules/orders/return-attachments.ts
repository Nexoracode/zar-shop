import { deleteStoredMedia, uploadMediaToFtp } from "@/modules/media/ftp-storage";
import { mediaFileSlug } from "@/modules/media/filename";
import { bufferMatchesMimeType } from "@/modules/media/file-signature";
import { returnAttachmentExtensions, returnLimits } from "@/modules/orders/return-limits";

export class ReturnAttachmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnAttachmentValidationError";
  }
}

export function validateReturnFiles(files: File[]) {
  if (files.length > returnLimits.maxAttachments) {
    throw new ReturnAttachmentValidationError(`حداکثر ${returnLimits.maxAttachments.toLocaleString("fa-IR")} فایل قابل پیوست است.`);
  }
  if (files.reduce((total, file) => total + file.size, 0) > returnLimits.maxTotalAttachmentSize) {
    throw new ReturnAttachmentValidationError("حجم مجموع پیوست‌ها بیش از حد مجاز است.");
  }
  for (const file of files) {
    if (!returnAttachmentExtensions[file.type]) throw new ReturnAttachmentValidationError("فقط عکس (JPG، PNG، WEBP) و ویدئو (MP4، WEBM، MOV) قابل پیوست است.");
    if (file.size > returnLimits.maxAttachmentSize) throw new ReturnAttachmentValidationError("حجم هر فایل باید کمتر از ۲۵ مگابایت باشد.");
  }
}

export type UploadedReturnFile = { originalName: string; storageKey: string; url: string; mimeType: string; sizeBytes: number };

/** Uploads all files to the same FTP-backed store the catalog gallery uses, under `returns/`. */
export async function uploadReturnFiles(files: File[]): Promise<UploadedReturnFile[]> {
  const uploaded: UploadedReturnFile[] = [];
  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!bufferMatchesMimeType(buffer, file.type)) {
        throw new ReturnAttachmentValidationError("محتوای یکی از فایل‌ها با نوع اعلام‌شده‌اش هم‌خوان نیست.");
      }
      const storageKey = `zar-shop/returns/${mediaFileSlug(file.name, returnAttachmentExtensions[file.type])}`;
      const url = await uploadMediaToFtp(buffer, storageKey);
      uploaded.push({ originalName: file.name, storageKey, url, mimeType: file.type, sizeBytes: file.size });
    }
    return uploaded;
  } catch (error) {
    await rollbackReturnFiles(uploaded);
    throw error;
  }
}

export async function rollbackReturnFiles(files: UploadedReturnFile[]) {
  await Promise.all(files.map((file) => deleteStoredMedia(file.storageKey, file.url).catch(() => undefined)));
}
