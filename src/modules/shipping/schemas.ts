import { z } from "zod";
import { tapinRateTypes } from "@/modules/shipping/tapin-rates";

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const shippingFieldLimits = { title: 100, carrier: 40 } as const;

/** Where a method's price comes from. */
export const shippingRateSources = ["TAPIN", "TABLE"] as const;

export const shippingZoneRateSchema = z.object({
  /** null is the catch-all row, used when no province-specific row matches. */
  provinceId: z.union([z.null(), z.string().cuid("استان انتخاب‌شده معتبر نیست.")]).default(null),
  maxWeightGrams: z.coerce.number("سقف وزن را وارد کنید.").int("سقف وزن باید عدد صحیح باشد.").positive("سقف وزن باید بیشتر از صفر باشد.").max(500_000, "سقف وزن بیش از حد مجاز است."),
  price: z.coerce.number("هزینه ارسال را وارد کنید.").int("هزینه ارسال باید عدد صحیح باشد.").nonnegative("هزینه ارسال نمی‌تواند منفی باشد.").max(999_999_999_999, "هزینه ارسال بیش از حد مجاز است."),
});

export const shippingMethodSchema = z.object({
  title: z.string().trim().min(2, "نام روش باید حداقل ۲ نویسه باشد.").max(shippingFieldLimits.title, "نام روش بیش از حد مجاز است."),
  carrier: z.string().trim().min(2, "نام شرکت حمل را وارد کنید.").max(shippingFieldLimits.carrier, "نام شرکت حمل بیش از حد مجاز است."),
  source: z.enum(shippingRateSources, "منبع نرخ را انتخاب کنید.").default("TABLE"),
  rateType: z.union([z.null(), z.enum(tapinRateTypes)]).default(null),
  /** Tapin's order type: 0 standard, 1 express. */
  orderType: z.coerce.number().int().min(0).max(9).default(1),
  estimatedDays: z.coerce.number("زمان تحویل را وارد کنید.").int("زمان تحویل باید عدد صحیح باشد.").min(0, "زمان تحویل نمی‌تواند منفی باشد.").max(90, "زمان تحویل نمی‌تواند بیشتر از ۹۰ روز باشد.").default(3),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  zones: z.array(shippingZoneRateSchema).max(200, "حداکثر ۲۰۰ ردیف نرخ برای هر روش مجاز است.").default([]),
}).superRefine((method, context) => {
  if (method.source === "TAPIN" && !method.rateType) {
    context.addIssue({ code: "custom", path: ["rateType"], message: "برای نرخ لحظه‌ای، شرکت حمل تاپین را انتخاب کنید." });
  }
  // Without a table row the method vanishes from checkout whenever the carrier is unreachable,
  // which looks like a bug to whoever configured it.
  if (method.source === "TAPIN" && method.zones.length === 0) {
    context.addIssue({ code: "custom", path: ["zones"], message: "حداقل یک نرخ پشتیبان تعریف کنید تا در صورت قطعی سرویس، این روش از تسویه حساب حذف نشود." });
  }
  const seen = new Set(method.zones.map((zone) => `${zone.provinceId ?? "*"}:${zone.maxWeightGrams}`));
  if (seen.size !== method.zones.length) {
    context.addIssue({ code: "custom", path: ["zones"], message: "برای یک استان نمی‌توان دو ردیف با سقف وزن یکسان داشت." });
  }
});

export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;
