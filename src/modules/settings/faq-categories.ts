/*
 * FAQ topics — the left-hand list on the storefront FAQ page. Fixed, like Digikala's.
 *
 * Kept apart from `content-settings.ts` (which imports `@/lib/db`) so the admin form and the
 * storefront FAQ component — both client components — can read these labels without dragging
 * Prisma and the MySQL driver into the browser bundle. Same split as `settings-limits.ts`.
 */

export const faqCategories = ["GETTING_STARTED", "ORDER", "PAYMENT", "SHIPPING", "RETURNS", "ACCOUNT", "PRODUCTS", "GENERAL"] as const;
export type FaqCategory = (typeof faqCategories)[number];

export const faqCategoryMeta: Record<FaqCategory, { label: string; description: string }> = {
  GETTING_STARTED: { label: "شروع کار و راهنمای خرید", description: "ثبت‌نام، ورود و اولین خرید" },
  ORDER: { label: "ثبت سفارش و پیگیری", description: "مراحل خرید، وضعیت و تغییر سفارش" },
  PAYMENT: { label: "پرداخت و کیف پول", description: "روش‌های پرداخت، فاکتور و اعتبار" },
  SHIPPING: { label: "ارسال و تحویل", description: "زمان و هزینهٔ ارسال، رهگیری مرسوله" },
  RETURNS: { label: "مرجوعی و بازگشت وجه", description: "شرایط مرجوعی و بازگرداندن مبلغ" },
  ACCOUNT: { label: "حساب کاربری", description: "پروفایل، نشانی‌ها و امنیت حساب" },
  PRODUCTS: { label: "کالاها و قیمت‌گذاری", description: "اصالت کالا، موجودی و نحوهٔ قیمت‌گذاری" },
  GENERAL: { label: "سایر پرسش‌ها", description: "موارد عمومی و پشتیبانی" },
};
