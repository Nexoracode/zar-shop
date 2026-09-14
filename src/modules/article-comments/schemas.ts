import { z } from "zod";

/** See `reviewFieldLimits`: one number per field, shared by the form control and the schema. */
export const commentFieldLimits = { body: 3000, moderationNote: 500 } as const;

const trimmedOptionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maximum).optional(),
);

// No rating/title on this model (unlike createProductReviewSchema) — article rating is a
// separate ArticleRating, and a comment doesn't carry its own title.
export const createArticleCommentSchema = z.object({
  parentId: trimmedOptionalText(191),
  body: z.string().trim().min(3, "متن دیدگاه را وارد کنید.").max(commentFieldLimits.body),
});

export const articleCommentVoteSchema = z.object({ value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export const adminArticleCommentModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: trimmedOptionalText(commentFieldLimits.moderationNote),
});

export const adminArticleCommentReplySchema = z.object({ body: z.string().trim().min(3).max(commentFieldLimits.body) });

export type CreateArticleCommentInput = z.infer<typeof createArticleCommentSchema>;
