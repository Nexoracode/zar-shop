import { z } from "zod";
import { db } from "@/lib/db";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export const contentPageIds = ["ABOUT", "CONTACT", "PRIVACY", "TERMS", "RETURNS", "SHIPPING"] as const;
export type ContentPageId = (typeof contentPageIds)[number];

export const contentPageMeta: Record<ContentPageId, { slug: string; defaultTitle: string }> = {
  ABOUT: { slug: "about", defaultTitle: "درباره ما" },
  CONTACT: { slug: "contact", defaultTitle: "تماس با ما" },
  PRIVACY: { slug: "privacy", defaultTitle: "حریم خصوصی" },
  TERMS: { slug: "terms", defaultTitle: "شرایط استفاده" },
  RETURNS: { slug: "returns", defaultTitle: "قوانین بازگشت کالا" },
  SHIPPING: { slug: "shipping", defaultTitle: "شیوه ارسال و تحویل" },
};

const faqSchema = z.object({
  id: z.string().trim().min(1).max(80),
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(3000),
  enabled: z.boolean(),
});

const pageSchema = z.object({
  id: z.enum(contentPageIds),
  title: z.string().trim().min(2).max(191),
  content: z.string().max(200_000),
  published: z.boolean(),
});

export const contentSettingsSchema = z.object({
  faqs: z.array(faqSchema).max(50).refine((items) => new Set(items.map((item) => item.id)).size === items.length, "شناسه سوال تکراری است."),
  pages: z.array(pageSchema).length(contentPageIds.length).superRefine((pages, context) => {
    const ids = new Set(pages.map((page) => page.id));
    if (ids.size !== contentPageIds.length || contentPageIds.some((id) => !ids.has(id))) {
      context.addIssue({ code: "custom", message: "فهرست صفحات محتوایی کامل یا معتبر نیست." });
    }
    pages.forEach((page, index) => {
      if (page.published && !page.content.replace(/<[^>]*>/g, "").trim() && !/<(img|table|hr)\b/i.test(page.content)) {
        context.addIssue({ code: "custom", path: [index, "content"], message: "صفحه منتشرشده باید محتوا داشته باشد." });
      }
    });
  }),
});

export type ContentSettings = z.infer<typeof contentSettingsSchema>;

export const contentSettingsDefaults: ContentSettings = {
  faqs: [
    { id: "faq-pricing", question: "قیمت محصولات چگونه محاسبه می‌شود؟", answer: "قیمت نهایی براساس مشخصات محصول و قواعد قیمت‌گذاری فروشگاه محاسبه می‌شود.", enabled: true },
    { id: "faq-invoice", question: "آیا محصولات فاکتور رسمی دارند؟", answer: "تمام سفارش‌های پرداخت‌شده همراه فاکتور فروشگاه ثبت و در حساب کاربری قابل مشاهده هستند.", enabled: true },
    { id: "faq-shipping", question: "مدت زمان ارسال سفارش چقدر است؟", answer: "زمان آماده‌سازی هر محصول مشخص است و زمان تحویل با توجه به روش ارسال و نشانی مشتری تعیین می‌شود.", enabled: true },
  ],
  pages: contentPageIds.map((id) => ({
    id,
    title: contentPageMeta[id].defaultTitle,
    content: id === "ABOUT" ? "<p>داستان، ارزش‌ها و مسیر شکل‌گیری فروشگاه را در این بخش معرفی کنید.</p>" : id === "CONTACT" ? "<p>راه‌های ارتباطی و ساعات پاسخ‌گویی فروشگاه را در این بخش بنویسید.</p>" : "",
    published: id === "ABOUT" || id === "CONTACT",
  })),
};

const select = { faqItems: true, contentPages: true } as const;

export async function getContentSettings(): Promise<ContentSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, faqItems: contentSettingsDefaults.faqs, contentPages: contentSettingsDefaults.pages },
    update: {},
    select,
  });
  const faqs = contentSettingsSchema.shape.faqs.safeParse(settings.faqItems);
  const pages = contentSettingsSchema.shape.pages.safeParse(settings.contentPages);
  return sanitizeContentSettings(contentSettingsSchema.parse({
    faqs: faqs.success ? faqs.data : contentSettingsDefaults.faqs,
    pages: pages.success ? pages.data : contentSettingsDefaults.pages,
  }));
}

export function sanitizeContentSettings(input: ContentSettings): ContentSettings {
  return { ...input, pages: input.pages.map((page) => ({ ...page, content: sanitizeProductDescription(page.content) })) };
}

export function contentPageBySlug(settings: ContentSettings, slug: string) {
  const id = contentPageIds.find((pageId) => contentPageMeta[pageId].slug === slug);
  return id ? settings.pages.find((page) => page.id === id) ?? null : null;
}
