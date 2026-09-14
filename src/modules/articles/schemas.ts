import { z } from "zod";

// One number per field, shared by the form control and the server schema — same convention as
// `brandFieldLimits` / `categoryFieldLimits`. Each cap matches the matching `@db.VarChar`.
export const articleFieldLimits = {
  title: 200,
  slug: 200,
  excerpt: 300,
  content: 200_000,
  metaTitle: 120,
  metaDescription: 320,
  categoryName: 120,
  categorySlug: 120,
  tag: 40,
  faqQuestion: 300,
  faqAnswer: 3000,
} as const;

export const articleStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const slug = (max: number) =>
  z.string().trim().min(2, "نشانی انگلیسی باید حداقل ۲ نویسه باشد.").max(max)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "نشانی انگلیسی فقط می‌تواند شامل حروف کوچک انگلیسی، رقم و خط تیره باشد.");

const optionalText = (max: number) =>
  z.union([z.null(), z.string().trim().max(max)]).transform((value) => value || null);

export const articleFaqSchema = z.object({
  id: z.string().cuid().optional(),
  question: z.string().trim().min(3, "سؤال را وارد کنید.").max(articleFieldLimits.faqQuestion),
  answer: z.string().trim().min(3, "پاسخ را وارد کنید.").max(articleFieldLimits.faqAnswer),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

const articleFields = {
  title: z.string().trim().min(3, "عنوان مقاله را وارد کنید.").max(articleFieldLimits.title),
  slug: slug(articleFieldLimits.slug),
  excerpt: z.string().trim().min(10, "خلاصهٔ مقاله دست‌کم ۱۰ نویسه باشد.").max(articleFieldLimits.excerpt),
  content: z.string().min(1, "متن مقاله را وارد کنید.").max(articleFieldLimits.content),
  coverMediaId: z.string().cuid().nullable().optional(),
  authorId: z.string().cuid("نویسنده را انتخاب کنید."),
  tags: z.array(z.string().trim().min(1).max(articleFieldLimits.tag)).max(20).optional(),
  relatedProductId: z.string().cuid().nullable().optional(),
  faqs: z.array(articleFaqSchema).max(30).optional(),
  status: z.enum(articleStatuses),
  publishedAt: z.union([z.null(), z.string().datetime({ offset: true }), z.string().datetime()]).optional(),
  categoryId: z.string().cuid("دستهٔ انتخاب‌شده معتبر نیست.").nullable().optional(),
  metaTitle: optionalText(articleFieldLimits.metaTitle),
  metaDescription: optionalText(articleFieldLimits.metaDescription),
  noindex: z.boolean(),
};

export const articleSchema = z.object({
  ...articleFields,
  status: articleFields.status.default("DRAFT"),
  noindex: articleFields.noindex.default(false),
});

// PATCH sends only the fields it changes; no defaults, so an absent key stays absent instead of
// resetting the column (same reasoning as `updateBrandSchema`).
export const updateArticleSchema = z.object(articleFields).partial();

export type ArticleInput = z.infer<typeof articleSchema>;

// —— categories (light config list, mirrors brandSchema) ——

const articleCategoryFields = {
  name: z.string().trim().min(2, "نام دسته را وارد کنید.").max(articleFieldLimits.categoryName),
  slug: slug(articleFieldLimits.categorySlug),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000),
};

export const articleCategorySchema = z.object({
  ...articleCategoryFields,
  isActive: articleCategoryFields.isActive.default(true),
  sortOrder: articleCategoryFields.sortOrder.default(0),
});

export const updateArticleCategorySchema = z.object(articleCategoryFields).partial();

// —— reader rating ——

export const articleRatingSchema = z.object({
  value: z.number().int().min(1, "امتیاز باید بین ۱ تا ۵ باشد.").max(5, "امتیاز باید بین ۱ تا ۵ باشد."),
});
