import { z } from "zod";
import { db } from "@/lib/db";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { faqCategories } from "@/modules/settings/faq-categories";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

// Re-exported for server-side importers; client components import from `faq-categories` directly.
export { faqCategories, faqCategoryMeta, type FaqCategory } from "@/modules/settings/faq-categories";

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
  category: z.enum(faqCategories).default("GENERAL"),
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
    { id: "faq-register", question: "چطور در سایت ثبت‌نام کنم؟", answer: "با شمارهٔ موبایل خود وارد صفحهٔ ورود شوید؛ کد تأییدی پیامک می‌شود و پس از وارد کردن آن، حساب شما ساخته و وارد می‌شوید.", category: "GETTING_STARTED", enabled: true },
    { id: "faq-guest", question: "بدون ثبت‌نام هم می‌توانم خرید کنم؟", answer: "برای پیگیری سفارش، مشاهدهٔ فاکتور و استفاده از کیف پول بهتر است حساب دائمی بسازید؛ اما امکان خرید مهمان نیز در دسترس است.", category: "GETTING_STARTED", enabled: true },
    { id: "faq-order-steps", question: "مراحل ثبت سفارش چگونه است؟", answer: "کالا را به سبد خرید اضافه کنید، در صفحهٔ تسویه‌حساب نشانی و روش ارسال را انتخاب کنید و پرداخت را انجام دهید. وضعیت سفارش در «حساب کاربری ← سفارش‌ها» نمایش داده می‌شود.", category: "ORDER", enabled: true },
    { id: "faq-order-track", question: "سفارشم را چطور پیگیری کنم؟", answer: "از بخش «سفارش‌ها» در حساب کاربری، وضعیت هر سفارش و کد رهگیری مرسوله (پس از ارسال) قابل مشاهده است.", category: "ORDER", enabled: true },
    { id: "faq-order-cancel", question: "امکان لغو سفارش وجود دارد؟", answer: "تا پیش از پرداخت می‌توانید سفارش را لغو کنید. پس از پرداخت، لغو یا تغییر سفارش را از طریق پشتیبانی پیگیری کنید.", category: "ORDER", enabled: true },
    { id: "faq-pay-methods", question: "روش‌های پرداخت چیست؟", answer: "پرداخت اینترنتی از طریق درگاه امن بانکی انجام می‌شود. در صورت داشتن اعتبار کیف پول، می‌توانید بخشی یا تمام مبلغ را با کیف پول بپردازید.", category: "PAYMENT", enabled: true },
    { id: "faq-invoice", question: "آیا سفارش‌ها فاکتور رسمی دارند؟", answer: "تمام سفارش‌های پرداخت‌شده همراه فاکتور فروشگاه ثبت می‌شوند و در حساب کاربری قابل مشاهده و دریافت هستند.", category: "PAYMENT", enabled: true },
    { id: "faq-wallet", question: "کیف پول چطور کار می‌کند؟", answer: "اعتبار کیف پول فقط برای خرید در همین فروشگاه استفاده می‌شود و قابل برداشت به حساب بانکی نیست. می‌توانید کیف پول را از درگاه پرداخت شارژ کنید.", category: "PAYMENT", enabled: true },
    { id: "faq-ship-time", question: "زمان ارسال سفارش چقدر است؟", answer: "زمان آماده‌سازی هر کالا در صفحهٔ محصول مشخص است و زمان تحویل با توجه به روش ارسال و نشانی مشتری تعیین می‌شود.", category: "SHIPPING", enabled: true },
    { id: "faq-ship-cost", question: "هزینهٔ ارسال چگونه محاسبه می‌شود؟", answer: "هزینهٔ ارسال بر اساس وزن سفارش، مقصد و روش ارسال انتخابی در صفحهٔ تسویه‌حساب محاسبه و نمایش داده می‌شود.", category: "SHIPPING", enabled: true },
    { id: "faq-return-window", question: "شرایط مرجوع کردن کالا چیست؟", answer: "برای سفارش‌های تحویل‌شده و داخل مهلت مرجوعی، از صفحهٔ جزئیات همان سفارش می‌توانید درخواست مرجوعی ثبت کنید و دلیل و تصویر کالا را پیوست کنید.", category: "RETURNS", enabled: true },
    { id: "faq-refund", question: "مبلغ مرجوعی چطور بازگردانده می‌شود؟", answer: "روش بازگرداندن وجه را در «حساب کاربری ← اطلاعات حساب» انتخاب می‌کنید: افزودن به کیف پول یا واریز به کارت بانکی ثبت‌شده.", category: "RETURNS", enabled: true },
    { id: "faq-account-address", question: "چطور نشانی جدید اضافه کنم؟", answer: "از بخش «نشانی‌ها» در حساب کاربری می‌توانید نشانی‌های تحویل را اضافه، ویرایش یا حذف کنید و نشانی پیش‌فرض را تعیین کنید.", category: "ACCOUNT", enabled: true },
    { id: "faq-authenticity", question: "اصالت کالاها تضمین می‌شود؟", answer: "همهٔ کالاها با تضمین اصالت و سلامت فیزیکی عرضه می‌شوند و در صورت مغایرت، امکان ثبت مرجوعی وجود دارد.", category: "PRODUCTS", enabled: true },
    { id: "faq-pricing", question: "قیمت کالاها چگونه تعیین می‌شود؟", answer: "قیمت نهایی بر اساس مشخصات کالا و قواعد قیمت‌گذاری فروشگاه محاسبه می‌شود. تخفیف‌ها و کد تخفیف در صفحهٔ سبد خرید و تسویه‌حساب اعمال می‌شوند.", category: "PRODUCTS", enabled: true },
    { id: "faq-support", question: "چطور با پشتیبانی در ارتباط باشم؟", answer: "از بخش «تیکت‌های پشتیبانی» در حساب کاربری می‌توانید پرسش خود را ثبت کنید؛ همچنین راه‌های ارتباطی در صفحهٔ «تماس با ما» آمده است.", category: "GENERAL", enabled: true },
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
