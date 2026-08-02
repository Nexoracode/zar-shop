import { z } from "zod";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export const homepageSectionIds = ["HERO", "PROMISES", "CATEGORIES", "PRODUCTS", "ABOUT", "CONCIERGE"] as const;
export type HomepageSectionId = (typeof homepageSectionIds)[number];

const sectionSchema = z.object({
  id: z.enum(homepageSectionIds),
  enabled: z.boolean(),
});

const menuCategoryIdsSchema = z.array(z.string().trim().min(1)).max(6).refine(
  (ids) => new Set(ids).size === ids.length,
  "دسته‌های منوی بالا نباید تکراری باشند.",
);

const safeHrefSchema = z.string().trim().min(1).max(500).refine(
  (value) => (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value)),
  "لینک دکمه باید یک مسیر داخلی یا نشانی امن HTTPS باشد.",
);
const optionalSafeHrefSchema = z.union([z.null(), z.literal(""), safeHrefSchema]).transform((value) => value || null);

export const homepageSettingsInputSchema = z.object({
  sections: z.array(sectionSchema).length(homepageSectionIds.length).superRefine((sections, context) => {
    const ids = new Set(sections.map((section) => section.id));
    if (ids.size !== homepageSectionIds.length || homepageSectionIds.some((id) => !ids.has(id))) {
      context.addIssue({ code: "custom", message: "چینش بخش‌های صفحه اصلی کامل یا معتبر نیست." });
    }
  }),
  menuCategoryIds: menuCategoryIdsSchema,
  heroContentMode: z.enum(["WITH_CONTENT", "IMAGE_ONLY"]),
  heroTitle: z.string().trim().min(2).max(191),
  heroDescription: z.string().trim().min(10).max(500),
  heroButtonLabel: z.string().trim().min(2).max(80),
  heroButtonHref: safeHrefSchema,
  heroDesktopMediaId: z.string().trim().min(1).nullable(),
  heroMobileMediaId: z.string().trim().min(1).nullable(),
  promoBannerEnabled: z.boolean(),
  promoBannerHref: optionalSafeHrefSchema,
  promoDesktopMediaId: z.string().trim().min(1).nullable(),
  promoMobileMediaId: z.string().trim().min(1).nullable(),
});

const mediaSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  alt: z.string().nullable(),
  url: z.string(),
  type: z.literal("IMAGE"),
  mimeType: z.string(),
});

export const homepageSettingsSchema = homepageSettingsInputSchema.extend({
  heroDesktopMedia: mediaSchema.nullable(),
  heroMobileMedia: mediaSchema.nullable(),
  promoDesktopMedia: mediaSchema.nullable(),
  promoMobileMedia: mediaSchema.nullable(),
});

export type HomepageSettingsInput = z.infer<typeof homepageSettingsInputSchema>;
export type HomepageSettings = z.infer<typeof homepageSettingsSchema>;

export const homepageSettingsDefaults: HomepageSettingsInput = {
  sections: homepageSectionIds.map((id) => ({ id, enabled: true })),
  menuCategoryIds: [],
  heroContentMode: "WITH_CONTENT",
  heroTitle: "درخشش ماندگار، انتخابی مطمئن",
  heroDescription: "جدیدترین زیورآلات طلا با قیمت لحظه‌ای و تضمین اصالت",
  heroButtonLabel: "مشاهده محصولات",
  heroButtonHref: "/products",
  heroDesktopMediaId: null,
  heroMobileMediaId: null,
  promoBannerEnabled: false,
  promoBannerHref: null,
  promoDesktopMediaId: null,
  promoMobileMediaId: null,
};

const homepageSelect = {
  homepageSections: true,
  menuCategoryIds: true,
  heroContentMode: true,
  heroTitle: true,
  heroDescription: true,
  heroButtonLabel: true,
  heroButtonHref: true,
  heroDesktopMediaId: true,
  heroMobileMediaId: true,
  promoBannerEnabled: true,
  promoBannerHref: true,
  promoDesktopMediaId: true,
  promoMobileMediaId: true,
  heroDesktopMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
  heroMobileMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
  promoDesktopMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
  promoMobileMedia: { select: { id: true, title: true, alt: true, url: true, type: true, mimeType: true } },
} as const;

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: homepageSelect });
  const { sections, ...homepageDefaults } = homepageSettingsDefaults;
  const settings = existing ?? await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, ...homepageDefaults, menuCategoryIds: undefined, homepageSections: sections },
    update: {},
    select: homepageSelect,
  });

  const parsedSections = homepageSettingsInputSchema.shape.sections.safeParse(settings.homepageSections);
  const parsedMenuCategoryIds = menuCategoryIdsSchema.safeParse(settings.menuCategoryIds);
  const menuCategoryIds = parsedMenuCategoryIds.success
    ? parsedMenuCategoryIds.data
    : (await db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 5,
      select: { id: true },
    })).map((category) => category.id);
  const input = {
    ...settings,
    sections: parsedSections.success ? parsedSections.data : homepageSettingsDefaults.sections,
    menuCategoryIds,
  };
  return homepageSettingsSchema.parse(input);
}

export type HomepageMenuCategoryOption = {
  id: string;
  name: string;
  childrenCount: number;
};

export async function getHomepageMenuCategoryOptions(): Promise<HomepageMenuCategoryOption[]> {
  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, _count: { select: { children: { where: { isActive: true } } } } },
  });
  return categories.map((category) => ({ id: category.id, name: category.name, childrenCount: category._count.children }));
}
