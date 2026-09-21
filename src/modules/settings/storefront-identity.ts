import { z } from "zod";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";

// The store's name, tagline and main logo — what the page builder's "name, tagline and logo" form edits.
// The name and tagline live with the general settings and the logo with the brand settings; this schema is
// the narrow slice of both that the builder saves in one go. Pure (no database imports) so the form can use it.
export const storefrontIdentityInputSchema = z.object({
  storeName: z.string().trim()
    .min(2, "نام فروشگاه باید حداقل ۲ نویسه باشد.")
    .max(generalSettingsFieldLimits.storeName, `نام فروشگاه نباید بیشتر از ${generalSettingsFieldLimits.storeName.toLocaleString("fa-IR")} نویسه باشد.`),
  tagline: z.string().trim()
    .min(2, "شعار فروشگاه باید حداقل ۲ نویسه باشد.")
    .max(generalSettingsFieldLimits.tagline, `شعار فروشگاه نباید بیشتر از ${generalSettingsFieldLimits.tagline.toLocaleString("fa-IR")} نویسه باشد.`),
  mainLogoMediaId: z.string().trim().min(1).nullable(),
});

export type StorefrontIdentityInput = z.infer<typeof storefrontIdentityInputSchema>;
