import { z } from "zod";
import { MAX_VARIANTS, selectionSignature } from "@/modules/products/variant-combinations";
import { productAttributesSchema } from "@/modules/products/attributes";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ واردشده معتبر نیست.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "تاریخ واردشده معتبر نیست.");

/** A full instant, for callers that pick a time of day as well as a date. */
const dateTimeSchema = z.string().datetime({ offset: true }).or(z.string().datetime());


/*
 * Discount bounds accept either form. A bare date still means the whole Tehran day, which is what
 * the classic admin form sends and what existing rows hold; an instant is stored as given, so the
 * Blueprint form's date-and-time picker is not silently rounded to midnight.
 */
const discountBoundarySchema = z.union([dateOnlySchema, dateTimeSchema], "تاریخ و ساعت واردشده معتبر نیست.");

export function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** See `authFieldLimits`: one number per field, shared by the form control and the schema. */
export const productFieldLimits = { sku: 80, name: 191, slug: 191, description: 200000, optionName: 80, optionValue: 80 } as const;

/** A parcel side in centimetres, to two decimals — what a carrier's form asks for. */
function dimensionSchema(label: string) {
  return z.coerce.number(`${label} را وارد کنید.`).positive(`${label} باید بیشتر از صفر باشد.`).max(500, `${label} نمی‌تواند بیشتر از ۵۰۰ سانتی‌متر باشد.`);
}

/** An untouched box arrives as "" or null; either way the column stays empty. */
function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable()).default(null);
}

/*
 * What the form sends about variants: which types the product offers, and one row per
 * combination of their values. The rows are built in the browser but never trusted — the server
 * rebuilds each combination's key from the selection it is given.
 */
const productOptionTypeSchema = z.object({
  typeId: z.string().cuid("نوع تنوع انتخاب‌شده معتبر نیست."),
  valueIds: z.array(z.string().cuid("مقدار تنوع انتخاب‌شده معتبر نیست."))
    .min(1, "برای هر نوع تنوع حداقل یک مقدار انتخاب کنید.")
    .max(50, "حداکثر ۵۰ مقدار برای هر نوع تنوع مجاز است.")
    .refine((ids) => new Set(ids).size === ids.length, "مقدار تکراری در یک نوع تنوع مجاز نیست."),
});

const productVariantSchema = z.object({
  selection: z.record(
    z.string().trim().min(1).max(productFieldLimits.optionName),
    z.string().trim().min(1).max(productFieldLimits.optionValue),
  ).refine((selection) => Object.keys(selection).length > 0, "ترکیب تنوع نمی‌تواند خالی باشد."),
  stock: z.coerce.number("موجودی ترکیب را وارد کنید.").int("موجودی ترکیب باید عدد صحیح باشد.").nonnegative("موجودی ترکیب نمی‌تواند منفی باشد.").default(0),
  isActive: z.boolean().default(true),
  weightGrams: z.string().trim().regex(/^\d{1,7}(\.\d{1,3})?$/, "وزن ترکیب باید حداکثر سه رقم اعشار داشته باشد.").nullable().default(null),
  price: z.string().trim().regex(/^[1-9]\d{0,17}$/, "قیمت ترکیب باید یک مبلغ معتبر و بیشتر از صفر باشد.").nullable().default(null),
  discountType: z.enum(["PERCENT", "FIXED"]).nullable().default(null),
  discountValue: z.string().trim().regex(/^\d{1,18}(\.\d{1,3})?$/, "مقدار تخفیف ترکیب معتبر نیست.").nullable().default(null),
  // A combination's discount window is its own — independent of the product's — but, like the
  // product's, may be entirely absent instead: a windowless «فروش ویژه» rather than a bare date
  // missing its other half.
  discountStartsAt: discountBoundarySchema.nullable().default(null),
  discountEndsAt: discountBoundarySchema.nullable().default(null),
}).superRefine((variant, context) => {
  const hasDiscountAmount = variant.discountType !== null || variant.discountValue !== null;
  if ((variant.discountType !== null) !== (variant.discountValue !== null)) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "نوع و مقدار تخفیف ترکیب را با هم مشخص کنید." });
  }
  if ((variant.discountStartsAt !== null) !== (variant.discountEndsAt !== null)) {
    context.addIssue({ code: "custom", path: ["discountEndsAt"], message: "بازه زمانی تخفیف ترکیب را کامل کنید یا برای فروش ویژه بدون زمان، هر دو را خالی بگذارید." });
  }
  if (!hasDiscountAmount && (variant.discountStartsAt !== null || variant.discountEndsAt !== null)) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "برای بازه زمانی تخفیف ترکیب، نوع و مقدار آن را هم مشخص کنید." });
  }
  if (variant.discountType === "PERCENT" && variant.discountValue !== null && Number(variant.discountValue) > 100) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد." });
  }
  if (variant.discountStartsAt && variant.discountEndsAt && variant.discountEndsAt < variant.discountStartsAt) {
    context.addIssue({ code: "custom", path: ["discountEndsAt"], message: "پایان تخفیف ترکیب باید بعد از شروع آن باشد." });
  }
});

/*
 * Every rule carries its own Persian message. Without one, zod falls back to English text such as
 * "Invalid input", which then surfaces verbatim under the field in the admin form.
 */
export const productSchema = z.object({
  sku: z.string().trim().min(2, "کد کالا باید حداقل ۲ نویسه باشد.").max(productFieldLimits.sku, "کد کالا نباید بیشتر از ۸۰ نویسه باشد."),
  name: z.string().trim().min(2, "نام محصول باید حداقل ۲ نویسه باشد.").max(productFieldLimits.name, "نام محصول نباید بیشتر از ۱۹۱ نویسه باشد."),
  slug: z.string().trim()
    .min(2, "نشانی انگلیسی باید حداقل ۲ نویسه باشد.")
    .max(productFieldLimits.slug, "نشانی انگلیسی نباید بیشتر از ۱۹۱ نویسه باشد.")
    .regex(/^[a-z0-9-]+$/, "نشانی انگلیسی فقط می‌تواند شامل حروف کوچک انگلیسی، رقم و خط تیره باشد."),
  description: z.string().max(productFieldLimits.description, "توضیحات محصول بیش از حد مجاز است.").optional(),
  categoryId: z.string("دسته‌بندی محصول را انتخاب کنید.").min(1, "دسته‌بندی محصول را انتخاب کنید.").cuid("دسته‌بندی انتخاب‌شده معتبر نیست."),
  brandId: z.string().cuid("برند انتخاب‌شده معتبر نیست.").nullable().optional(),
  storeIndustry: z.enum(["GOLD", "GENERAL"]).default("GOLD"),
  purity: z.coerce.number("عیار را وارد کنید.").int("عیار باید عدد صحیح باشد.").min(1, "عیار باید بین ۱ تا ۹۹۹ باشد.").max(999, "عیار باید بین ۱ تا ۹۹۹ باشد.").default(750),
  weightGrams: z.coerce.number("وزن را وارد کنید.").nonnegative("وزن نمی‌تواند منفی باشد.").max(100000, "وزن واردشده بیش از حد مجاز است."),
  makingFeeType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  makingFeeValue: z.coerce.number("مقدار اجرت را وارد کنید.").nonnegative("اجرت نمی‌تواند منفی باشد."),
  profitPercent: z.coerce.number("درصد سود را وارد کنید.").min(0, "درصد سود نمی‌تواند منفی باشد.").max(100, "درصد سود نمی‌تواند بیشتر از ۱۰۰ باشد."),
  taxPercent: z.coerce.number("درصد مالیات را وارد کنید.").min(0, "درصد مالیات نمی‌تواند منفی باشد.").max(100, "درصد مالیات نمی‌تواند بیشتر از ۱۰۰ باشد."),
  fixedPrice: z.coerce.number("قیمت فروش را وارد کنید.").positive("قیمت فروش باید بیشتر از صفر باشد.").max(999999999999999999, "قیمت واردشده بیش از حد مجاز است.").nullable().default(null),
  discountType: z.enum(["PERCENT", "FIXED"], "نوع تخفیف را انتخاب کنید.").nullable().default(null),
  discountValue: z.coerce.number("مقدار تخفیف را وارد کنید.").positive("مقدار تخفیف باید بیشتر از صفر باشد.").max(999999999999999999, "مقدار تخفیف بیش از حد مجاز است.").nullable().default(null),
  discountStartsAt: discountBoundarySchema.nullable().default(null),
  discountEndsAt: discountBoundarySchema.nullable().default(null),
  stock: z.coerce.number("موجودی انبار را وارد کنید.").int("موجودی باید عدد صحیح باشد.").nonnegative("موجودی نمی‌تواند منفی باشد."),
  preparationDays: z.coerce.number("زمان آماده‌سازی را وارد کنید.").int("زمان آماده‌سازی باید عدد صحیح باشد.").min(0, "زمان آماده‌سازی نمی‌تواند منفی باشد.").max(90, "زمان آماده‌سازی نمی‌تواند بیشتر از ۹۰ روز باشد.").default(2),
  // Shipping figures describe the parcel, not the gold: left null until someone measures it.
  shippingWeightGrams: emptyToNull(z.coerce.number("وزن ارسال را وارد کنید.").int("وزن ارسال باید عدد صحیح باشد.").positive("وزن ارسال باید بیشتر از صفر باشد.").max(500000, "وزن ارسال بیش از حد مجاز است.")),
  packageLengthCm: emptyToNull(dimensionSchema("طول بسته")),
  packageWidthCm: emptyToNull(dimensionSchema("عرض بسته")),
  packageHeightCm: emptyToNull(dimensionSchema("ارتفاع بسته")),
  minOrderQuantity: z.coerce.number("حداقل سفارش را وارد کنید.").int("حداقل سفارش باید عدد صحیح باشد.").min(1, "حداقل سفارش نمی‌تواند کمتر از ۱ باشد.").max(1000, "حداقل سفارش بیش از حد مجاز است.").default(1),
  maxOrderQuantity: emptyToNull(z.coerce.number("حداکثر سفارش را وارد کنید.").int("حداکثر سفارش باید عدد صحیح باشد.").positive("حداکثر سفارش باید بیشتر از صفر باشد.").max(1000, "حداکثر سفارش بیش از حد مجاز است.")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  mediaIds: z.array(z.string().cuid("رسانه انتخاب‌شده معتبر نیست.")).max(20, "حداکثر ۲۰ رسانه برای هر محصول مجاز است.").refine((ids) => new Set(ids).size === ids.length, "رسانه تکراری مجاز نیست.").default([]),
  optionTypes: z.array(productOptionTypeSchema)
    .max(5, "حداکثر ۵ نوع تنوع برای هر محصول مجاز است.")
    .refine((types) => new Set(types.map((type) => type.typeId)).size === types.length, "نوع تنوع تکراری مجاز نیست.")
    .default([]),
  variants: z.array(productVariantSchema)
    .max(MAX_VARIANTS, "تعداد ترکیب‌های این محصول بیش از حد مجاز است.")
    .refine((variants) => new Set(variants.map((variant) => selectionSignature(variant.selection))).size === variants.length, "ترکیب تکراری مجاز نیست.")
    .default([]),
  optionGuideId: z.string().cuid().nullable().default(null),
  attributes: productAttributesSchema.default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

export function parseProductPatch(value: unknown): Partial<ProductInput> {
  const parsed = productSchema.partial().parse(value);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return parsed;

  return Object.fromEntries(
    Object.entries(parsed).filter(([key]) => Object.prototype.hasOwnProperty.call(value, key)),
  ) as Partial<ProductInput>;
}

export const completeProductSchema = productSchema.superRefine((product, context) => {
  if (product.storeIndustry === "GOLD" && product.weightGrams <= 0) {
    context.addIssue({ code: "custom", path: ["weightGrams"], message: "وزن محصول طلا باید بیشتر از صفر باشد." });
  }
  if (product.storeIndustry === "GENERAL" && product.fixedPrice === null) {
    context.addIssue({ code: "custom", path: ["fixedPrice"], message: "قیمت محصول را وارد کنید." });
  }
  // Type and value always travel together. The window is the one part allowed to be entirely
  // absent instead — that is a "فروش ویژه", a discount with no schedule rather than a bare date
  // missing its other half.
  const hasDiscountAmount = product.discountType !== null || product.discountValue !== null;
  if ((product.discountType !== null) !== (product.discountValue !== null)) {
    context.addIssue({ code: "custom", path: ["discountType"], message: "نوع و مقدار تخفیف را با هم مشخص کنید." });
  }
  if ((product.discountStartsAt !== null) !== (product.discountEndsAt !== null)) {
    context.addIssue({ code: "custom", path: ["discountStartsAt"], message: "بازه زمانی تخفیف را کامل کنید یا برای فروش ویژه بدون زمان، هر دو را خالی بگذارید." });
  }
  if (!hasDiscountAmount && (product.discountStartsAt !== null || product.discountEndsAt !== null)) {
    context.addIssue({ code: "custom", path: ["discountType"], message: "برای بازه زمانی تخفیف، نوع و مقدار آن را هم مشخص کنید." });
  }
  if (product.discountType === "PERCENT" && product.discountValue !== null && product.discountValue > 100) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد." });
  }
  if (product.maxOrderQuantity !== null && product.maxOrderQuantity < product.minOrderQuantity) {
    context.addIssue({ code: "custom", path: ["maxOrderQuantity"], message: "حداکثر سفارش نمی‌تواند کمتر از حداقل سفارش باشد." });
  }
  if (product.discountStartsAt && product.discountEndsAt && product.discountEndsAt < product.discountStartsAt) {
    context.addIssue({ code: "custom", path: ["discountEndsAt"], message: "پایان تخفیف باید بعد از شروع آن باشد." });
  }
  if (product.storeIndustry === "GOLD" && product.variants.some((variant) => variant.price !== null)) {
    context.addIssue({ code: "custom", path: ["variants"], message: "برای محصول طلا، قیمت ترکیب از وزن آن محاسبه می‌شود." });
  }
  if (product.storeIndustry === "GENERAL" && product.variants.some((variant) => variant.weightGrams !== null)) {
    context.addIssue({ code: "custom", path: ["variants"], message: "برای محصول معمولی، به‌جای وزن می‌توانید قیمت مستقیم ترکیب را وارد کنید." });
  }
  // A combination names its types; offering one the product does not carry is a broken form.
  const offered = new Set(product.variants.flatMap((variant) => Object.keys(variant.selection)));
  if (product.optionTypes.length === 0 && offered.size > 0) {
    context.addIssue({ code: "custom", path: ["variants"], message: "برای تعریف ترکیب، ابتدا نوع تنوع محصول را انتخاب کنید." });
  }
});
