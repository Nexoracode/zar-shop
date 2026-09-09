import { z } from "zod";
import type { StoreIndustry } from "@generated/prisma/enums";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";

// Client-safe half of the setup module: step ids, Zod schemas and pure helpers, kept apart
// from `setup.ts` (which is `server-only` and reads the database) so the wizard's client
// step components can validate with the same schema the API uses. Same split as
// `settings-limits.ts` vs the settings modules.

export const SETUP_STEP_IDS = ["basics", "contact", "brand", "payment-sms", "shipping"] as const;
export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

// Steps that only write text columns already carrying defaults, so completion cannot be
// derived from the data and is tracked explicitly in `StoreSetting.setupStepsDone`.
export const SETUP_EXPLICIT_STEP_IDS = ["basics", "contact"] as const;
export type SetupExplicitStepId = (typeof SETUP_EXPLICIT_STEP_IDS)[number];

const optionalText = (max: number) =>
  z.union([z.null(), z.string().trim().max(max)]).transform((value) => value || null);

export const setupBasicsSchema = z.object({
  industry: z.enum(["GOLD", "GENERAL"]),
  storeName: z.string().trim().min(2, "نام فروشگاه را وارد کنید.").max(generalSettingsFieldLimits.storeName),
  tagline: z.string().trim().min(2, "شعار کوتاه را وارد کنید.").max(generalSettingsFieldLimits.tagline),
  shortDescription: z.string().trim().min(10, "توضیح کوتاه فروشگاه دست‌کم ۱۰ نویسه باشد.").max(generalSettingsFieldLimits.shortDescription),
});

export const setupContactSchema = z.object({
  supportPhone: z.string().trim().min(3, "شماره تماس پشتیبانی را وارد کنید.").max(generalSettingsFieldLimits.supportPhone),
  supportEmail: z.union([z.null(), z.literal(""), z.email("ایمیل معتبر نیست.").max(generalSettingsFieldLimits.supportEmail)]).transform((value) => value || null),
  storeAddress: z.string().trim().min(5, "نشانی فروشگاه را وارد کنید.").max(generalSettingsFieldLimits.storeAddress),
  legalIdentifier: z.string().trim().min(3, "شناسه ملی یا کد اقتصادی را وارد کنید.").max(generalSettingsFieldLimits.legalIdentifier),
  supportHours: optionalText(generalSettingsFieldLimits.supportHours),
});

export const setupShippingOriginSchema = z.object({
  originProvinceId: z.string().trim().min(1, "استان مبدأ را انتخاب کنید."),
  originCityId: z.string().trim().min(1, "شهر مبدأ را انتخاب کنید."),
});

// Body of `PATCH /api/admin/setup` — one discriminated shape per text-driven step.
export const setupStepPayloadSchema = z.discriminatedUnion("step", [
  setupBasicsSchema.extend({ step: z.literal("basics") }),
  setupContactSchema.extend({ step: z.literal("contact") }),
  setupShippingOriginSchema.extend({ step: z.literal("shipping-origin") }),
]);
export type SetupStepPayload = z.infer<typeof setupStepPayloadSchema>;

export type SetupState = {
  completed: boolean;
  completedAt: string | null;
  industry: StoreIndustry;
  steps: Record<SetupStepId, boolean>;
  allStepsSatisfied: boolean;
};

export function readStepsDone(value: unknown): SetupExplicitStepId[] {
  if (!Array.isArray(value)) return [];
  return SETUP_EXPLICIT_STEP_IDS.filter((id) => value.includes(id));
}
