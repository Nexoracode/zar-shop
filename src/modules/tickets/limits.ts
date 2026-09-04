/** One number per field, shared by the form control and the schema. */
export const ticketFieldLimits = {
  categoryName: 120,
  subject: 191,
  message: 4000,
  ratingReason: 500,
} as const;

export const TICKET_MAX_ATTACHMENTS = 4;
export const TICKET_MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const TICKET_MAX_TOTAL_ATTACHMENT_SIZE = 30 * 1024 * 1024;

/** Extension by MIME type — mirrors `src/app/api/media/route.ts`'s allow-list, narrowed to what a support chat needs. */
export const TICKET_ATTACHMENT_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
