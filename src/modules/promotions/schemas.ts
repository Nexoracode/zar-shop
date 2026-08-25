import { z } from "zod";

const nullableMoney = z.coerce.number().nonnegative().max(999999999999999999).nullable().default(null);
const nullablePositiveInt = z.coerce.number().int().positive().max(1_000_000).nullable().default(null);

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const promotionFieldLimits = { title: 191, code: 64 } as const;

export const promotionSchema = z.object({
  title: z.string().trim().min(3).max(promotionFieldLimits.title),
  type: z.enum(["COUPON", "FREE_SHIPPING", "NEXT_PURCHASE", "FIRST_PURCHASE"]),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,64}$/).nullable().default(null),
  discountType: z.enum(["PERCENT", "FIXED"]).nullable().default(null),
  discountValue: z.coerce.number().positive().max(999999999999999999).nullable().default(null),
  minOrderAmount: nullableMoney,
  maxDiscountAmount: nullableMoney,
  usageLimit: nullablePositiveInt,
  perUserLimit: z.coerce.number().int().positive().max(100).default(1),
  rewardExpiresDays: nullablePositiveInt,
  shippingScope: z.enum(["ALL", "TEHRAN"]).nullable().default(null),
  startsAt: z.string().date(),
  endsAt: z.string().date(),
  isActive: z.boolean().default(true),
}).superRefine((promotion, context) => {
  const needsDiscount = promotion.type === "COUPON" || promotion.type === "NEXT_PURCHASE" || promotion.type === "FIRST_PURCHASE";
  if (promotion.type === "COUPON" && !promotion.code) context.addIssue({ code: "custom", path: ["code"], message: "کد تخفیف الزامی است." });
  if (promotion.type !== "COUPON" && promotion.code) context.addIssue({ code: "custom", path: ["code"], message: "کد فقط برای پروموشن کد تخفیف قابل ثبت است." });
  if (needsDiscount && (!promotion.discountType || promotion.discountValue === null)) context.addIssue({ code: "custom", path: ["discountValue"], message: "نوع و مقدار تخفیف الزامی است." });
  if (!needsDiscount && (promotion.discountType || promotion.discountValue !== null)) context.addIssue({ code: "custom", path: ["discountValue"], message: "ارسال رایگان مقدار تخفیف جداگانه ندارد." });
  if (promotion.discountType === "PERCENT" && promotion.discountValue !== null && promotion.discountValue > 100) context.addIssue({ code: "custom", path: ["discountValue"], message: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد." });
  if (promotion.type === "NEXT_PURCHASE" && !promotion.rewardExpiresDays) context.addIssue({ code: "custom", path: ["rewardExpiresDays"], message: "مهلت استفاده از پاداش الزامی است." });
  if (promotion.type !== "NEXT_PURCHASE" && promotion.rewardExpiresDays) context.addIssue({ code: "custom", path: ["rewardExpiresDays"], message: "مهلت پاداش فقط برای خرید بعدی قابل ثبت است." });
  if (promotion.type === "FREE_SHIPPING" && !promotion.shippingScope) context.addIssue({ code: "custom", path: ["shippingScope"], message: "محدوده ارسال الزامی است." });
  if (promotion.type !== "FREE_SHIPPING" && promotion.shippingScope) context.addIssue({ code: "custom", path: ["shippingScope"], message: "محدوده ارسال فقط برای ارسال رایگان قابل ثبت است." });
  if (promotion.endsAt < promotion.startsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "پایان اعتبار باید بعد از شروع آن باشد." });
});

export const updatePromotionSchema = promotionSchema;
export type PromotionInput = z.infer<typeof promotionSchema>;

