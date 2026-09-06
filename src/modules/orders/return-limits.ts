/**
 * Length and upload limits for the return-request and admin-note fields. Kept in their own module
 * (no `db` import) so both the server schema in `returns.ts` and the client-side forms can read
 * the same numbers — the same split as `src/modules/tickets/limits.ts`.
 */
export const returnLimits = {
  /** Customer's free-text reason for the return. */
  reasonMin: 10,
  reasonMax: 1000,
  /** Admin's internal note on the decision. */
  adminNoteMax: 1000,
  /** Photo/video evidence the customer may attach. */
  maxAttachments: 5,
  maxAttachmentSize: 25 * 1024 * 1024,
  maxTotalAttachmentSize: 60 * 1024 * 1024,
} as const;

/** Extension by MIME type — photos and short videos, the two kinds of return evidence. */
export const returnAttachmentExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

/** `accept` attribute value for the file picker. */
export const returnAttachmentAccept = Object.keys(returnAttachmentExtensions).join(",");
