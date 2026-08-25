import { z } from "zod";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const reviewFieldLimits = { title: 120, body: 3000, reportDetails: 500, moderationNote: 500 } as const;

const trimmedOptionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maximum).optional(),
);

export const createProductReviewSchema = z.object({
  parentId: trimmedOptionalText(191),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: trimmedOptionalText(reviewFieldLimits.title),
  body: z.string().trim().min(3).max(reviewFieldLimits.body),
}).superRefine((input, context) => {
  if (!input.parentId && input.rating === undefined) context.addIssue({ code: "custom", path: ["rating"], message: "امتیاز دیدگاه را انتخاب کنید." });
  if (!input.parentId && !input.title) context.addIssue({ code: "custom", path: ["title"], message: "عنوان دیدگاه را وارد کنید." });
  if (input.parentId && (input.rating !== undefined || input.title)) context.addIssue({ code: "custom", path: ["parentId"], message: "پاسخ فقط شامل متن است." });
});

export const productReviewVoteSchema = z.object({ value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export const productReviewReportReasons = ["SPAM", "ABUSE", "MISINFORMATION", "IRRELEVANT", "OTHER"] as const;
export const productReviewReportSchema = z.object({
  reason: z.enum(productReviewReportReasons),
  details: trimmedOptionalText(reviewFieldLimits.reportDetails),
});

export const adminReviewModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: trimmedOptionalText(reviewFieldLimits.moderationNote),
});

export const adminReviewReplySchema = z.object({ body: z.string().trim().min(3).max(reviewFieldLimits.body) });
export const adminReviewReportSchema = z.object({ status: z.enum(["RESOLVED", "DISMISSED"]) });

export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;
