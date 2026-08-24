import { z } from "zod";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

const hexColor = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "رنگ باید با فرمت شش‌رقمی مانند #1C3155 باشد.").transform((value) => value.toUpperCase());
const mediaId = z.string().trim().min(1).nullable();

export const brandSettingsInputSchema = z.object({
  brandPrimaryColor: hexColor,
  brandAccentColor: hexColor,
  brandBackgroundColor: hexColor,
  brandDangerColor: hexColor,
  adminTemplate: z.enum(["CLASSIC", "BLUEPRINT"]),
  enforceColorContrast: z.boolean(),
  stickyStoreHeader: z.boolean(),
  compactMobileGrid: z.boolean(),
  liveGoldPrice: z.boolean(),
  mainLogoMediaId: mediaId,
  darkLogoMediaId: mediaId,
  faviconMediaId: mediaId,
  socialImageMediaId: mediaId,
});

const brandMediaSchema = z.object({ id: z.string(), title: z.string().nullable(), alt: z.string().nullable(), url: z.string(), type: z.literal("IMAGE"), mimeType: z.string() });
export const brandSettingsSchema = brandSettingsInputSchema.extend({
  mainLogoMedia: brandMediaSchema.nullable(),
  darkLogoMedia: brandMediaSchema.nullable(),
  faviconMedia: brandMediaSchema.nullable(),
  socialImageMedia: brandMediaSchema.nullable(),
});
export type BrandSettingsInput = z.infer<typeof brandSettingsInputSchema>;
export type BrandSettings = z.infer<typeof brandSettingsSchema>;

export const brandSettingsDefaults: BrandSettingsInput = {
  brandPrimaryColor: "#1C3155", brandAccentColor: "#B5904C", brandBackgroundColor: "#F7F6F3", brandDangerColor: "#B8423A",
  adminTemplate: "CLASSIC",
  enforceColorContrast: true, stickyStoreHeader: true, compactMobileGrid: true, liveGoldPrice: true,
  mainLogoMediaId: null, darkLogoMediaId: null, faviconMediaId: null, socialImageMediaId: null,
};

const select = {
  brandPrimaryColor: true, brandAccentColor: true, brandBackgroundColor: true, brandDangerColor: true,
  adminTemplate: true,
  enforceColorContrast: true, stickyStoreHeader: true, compactMobileGrid: true, liveGoldPrice: true,
  mainLogoMediaId: true, darkLogoMediaId: true, faviconMediaId: true, socialImageMediaId: true,
  mainLogoMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
  darkLogoMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
  faviconMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
  socialImageMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
} as const;

export async function getBrandSettings(): Promise<BrandSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select });
  const settings = existing ?? await db.storeSetting.upsert({ where: { id: STORE_SETTING_ID }, create: { id: STORE_SETTING_ID, ...brandSettingsDefaults }, update: {}, select });
  return brandSettingsSchema.parse(settings);
}

function foregroundFor(hex: string) {
  const values = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]) > 0.45 ? "#17233B" : "#FFFFFF";
}

export function brandCssVariables(settings: BrandSettings) {
  return {
    "--brand-primary": settings.brandPrimaryColor,
    "--brand-primary-foreground": settings.enforceColorContrast ? foregroundFor(settings.brandPrimaryColor) : "#FFFFFF",
    "--brand-accent": settings.brandAccentColor,
    "--brand-accent-foreground": settings.enforceColorContrast ? foregroundFor(settings.brandAccentColor) : "#FFFFFF",
    "--brand-background": settings.brandBackgroundColor,
    "--brand-danger": settings.brandDangerColor,
    "--brand-danger-foreground": settings.enforceColorContrast ? foregroundFor(settings.brandDangerColor) : "#FFFFFF",
    "--accent": settings.brandPrimaryColor,
    "--accent-foreground": settings.enforceColorContrast ? foregroundFor(settings.brandPrimaryColor) : "#FFFFFF",
    "--focus": settings.brandAccentColor,
    "--warning": settings.brandAccentColor,
    "--warning-foreground": settings.enforceColorContrast ? foregroundFor(settings.brandAccentColor) : "#17233B",
    "--background": settings.brandBackgroundColor,
    "--danger": settings.brandDangerColor,
    "--danger-foreground": settings.enforceColorContrast ? foregroundFor(settings.brandDangerColor) : "#FFFFFF",
  } as Record<string, string>;
}
