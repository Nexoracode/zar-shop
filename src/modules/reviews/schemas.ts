import { z } from "zod";

const trimmedOptionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maximum).optional(),
);

export const createProductReviewSchema = z.object({
  parentId: trimmedOptionalText(191),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: trimmedOptionalText(120),
  body: z.string().trim().min(3).max(3000),
}).superRefine((input, context) => {
  if (!input.parentId && input.rating === undefined) context.addIssue({ code: "custom", path: ["rating"], message: "امتیاز دیدگاه را انتخاب کنید." });
  if (!input.parentId && !input.title) context.addIssue({ code: "custom", path: ["title"], message: "عنوان دیدگاه را وارد کنید." });
  if (input.parentId && (input.rating !== undefined || input.title)) context.addIssue({ code: "custom", path: ["parentId"], message: "پاسخ فقط شامل متن است." });
});

export const productReviewVoteSchema = z.object({ value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export const productReviewReportReasons = ["SPAM", "ABUSE", "MISINFORMATION", "IRRELEVANT", "OTHER"] as const;
export const productReviewReportSchema = z.object({
  reason: z.enum(productReviewReportReasons),
  details: trimmedOptionalText(500),
});

export const adminReviewModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: trimmedOptionalText(500),
});

export const adminReviewReplySchema = z.object({ body: z.string().trim().min(3).max(3000) });
export const adminReviewReportSchema = z.object({ status: z.enum(["RESOLVED", "DISMISSED"]) });

export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;
