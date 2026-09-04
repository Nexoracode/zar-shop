import { deleteStoredMedia, uploadMediaToFtp } from "@/modules/media/ftp-storage";
import { mediaFileSlug } from "@/modules/media/filename";
import { TICKET_ATTACHMENT_EXTENSIONS, TICKET_MAX_ATTACHMENTS, TICKET_MAX_ATTACHMENT_SIZE, TICKET_MAX_TOTAL_ATTACHMENT_SIZE } from "@/modules/tickets/limits";

export class TicketAttachmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketAttachmentValidationError";
  }
}

export function validateTicketFiles(files: File[]) {
  if (files.length > TICKET_MAX_ATTACHMENTS) throw new TicketAttachmentValidationError(`در هر پیام حداکثر ${TICKET_MAX_ATTACHMENTS.toLocaleString("fa-IR")} فایل قابل پیوست است.`);
  if (files.reduce((total, file) => total + file.size, 0) > TICKET_MAX_TOTAL_ATTACHMENT_SIZE) {
    throw new TicketAttachmentValidationError("حجم مجموع پیوست‌ها بیش از حد مجاز است.");
  }
  for (const file of files) {
    if (!TICKET_ATTACHMENT_EXTENSIONS[file.type]) throw new TicketAttachmentValidationError("نوع فایل انتخاب‌شده مجاز نیست.");
    if (file.size > TICKET_MAX_ATTACHMENT_SIZE) throw new TicketAttachmentValidationError("حجم فایل بیش از حد مجاز است.");
  }
}

export type UploadedTicketFile = { originalName: string; storageKey: string; url: string; mimeType: string; sizeBytes: number };

/** Uploads all files to the same FTP-backed store the catalog gallery uses, under its own folder. */
export async function uploadTicketFiles(files: File[]): Promise<UploadedTicketFile[]> {
  const uploaded: UploadedTicketFile[] = [];
  try {
    for (const file of files) {
      const storageKey = `zar-shop/tickets/${mediaFileSlug(file.name, TICKET_ATTACHMENT_EXTENSIONS[file.type])}`;
      const url = await uploadMediaToFtp(Buffer.from(await file.arrayBuffer()), storageKey);
      uploaded.push({ originalName: file.name, storageKey, url, mimeType: file.type, sizeBytes: file.size });
    }
    return uploaded;
  } catch (error) {
    await rollbackTicketFiles(uploaded);
    throw error;
  }
}

export async function rollbackTicketFiles(files: UploadedTicketFile[]) {
  await Promise.all(files.map((file) => deleteStoredMedia(file.storageKey, file.url).catch(() => undefined)));
}
