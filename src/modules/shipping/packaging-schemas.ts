import { z } from "zod";
import { packagingFieldLimits as lim } from "./packaging-limits";

/**
 * One box definition, validated the same way on the form and in the API.
 *
 * `weightGrams` is the empty box; it has to stay under `maxWeightGrams` (the weight of contents
 * the box can carry), which the cross-field check at the end enforces.
 */
export const packagingBoxSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "نام جعبه باید حداقل ۲ نویسه باشد.")
      .max(lim.name, `نام جعبه نباید بیشتر از ${lim.name} نویسه باشد.`),
    lengthCm: z.coerce
      .number("طول را وارد کنید.")
      .positive("طول باید بیشتر از صفر باشد.")
      .max(lim.maxDimensionCm, "طول بیش از حد مجاز است."),
    widthCm: z.coerce
      .number("عرض را وارد کنید.")
      .positive("عرض باید بیشتر از صفر باشد.")
      .max(lim.maxDimensionCm, "عرض بیش از حد مجاز است."),
    heightCm: z.coerce
      .number("ارتفاع را وارد کنید.")
      .positive("ارتفاع باید بیشتر از صفر باشد.")
      .max(lim.maxDimensionCm, "ارتفاع بیش از حد مجاز است."),
    weightGrams: z.coerce
      .number("وزن جعبه را وارد کنید.")
      .int("وزن جعبه باید عدد صحیح باشد.")
      .nonnegative("وزن جعبه نمی‌تواند منفی باشد.")
      .max(lim.maxBoxWeightGrams, "وزن جعبه بیش از حد مجاز است."),
    maxWeightGrams: z.coerce
      .number("حداکثر وزن محتوا را وارد کنید.")
      .int("حداکثر وزن محتوا باید عدد صحیح باشد.")
      .positive("حداکثر وزن محتوا باید بیشتر از صفر باشد.")
      .max(lim.maxWeightGrams, "حداکثر وزن محتوا بیش از حد مجاز است."),
    tapinBoxId: z
      .union([
        z.null(),
        z.coerce
          .number("شناسه تاپین باید عدد باشد.")
          .int("شناسه تاپین باید عدد صحیح باشد.")
          .positive("شناسه تاپین باید بیشتر از صفر باشد.")
          .max(lim.maxTapinBoxId, "شناسه تاپین بیش از حد مجاز است."),
      ])
      .default(null),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .superRefine((box, ctx) => {
    if (box.weightGrams >= box.maxWeightGrams) {
      ctx.addIssue({
        code: "custom",
        path: ["weightGrams"],
        message: "وزن جعبه خالی باید کمتر از حداکثر وزن محتوا باشد.",
      });
    }
  });

export type PackagingBoxInput = z.infer<typeof packagingBoxSchema>;
