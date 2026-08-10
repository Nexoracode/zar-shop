import { z } from "zod";
import { db } from "@/lib/db";
import { STORE_SETTING_ID } from "@/modules/settings/store-settings";

export const homepageSectionIds = ["HERO", "FEATURED_PRODUCTS", "POPULAR_PRODUCTS", "LATEST_PRODUCTS", "ABOUT", "PROMISES", "CONCIERGE"] as const;
export type HomepageSectionId = (typeof homepageSectionIds)[number];
export type HomepageLayoutItemId = HomepageSectionId | `TILE_GROUP:${string}`;
export const homepageTileLayouts = ["TWO_COLUMNS", "THREE_COLUMNS", "FOUR_COLUMNS", "TWO_BY_TWO"] as const;
export type HomepageTileLayout = (typeof homepageTileLayouts)[number];
export const homepageTreasureCardIds = ["UNDER_20", "FROM_20_TO_60", "FROM_60_TO_100", "OVER_100"] as const;
export type HomepageTreasureCardId = (typeof homepageTreasureCardIds)[number];
export const homepageLicenseIds = ["SALES", "ONLINE", "ENAMAD"] as const;
export type HomepageLicenseId = (typeof homepageLicenseIds)[number];

const tileGroupSectionIdSchema = z.custom<`TILE_GROUP:${string}`>(
  (value) => typeof value === "string" && /^TILE_GROUP:[^:]{1,80}$/.test(value),
  "شناسه ردیف تایل معتبر نیست.",
);

const sectionSchema = z.object({
  id: z.union([z.enum(homepageSectionIds), tileGroupSectionIdSchema]),
  enabled: z.boolean(),
});

const treasureCardSchema = z.object({
  id: z.enum(homepageTreasureCardIds),
  mediaId: z.string().trim().min(1).nullable(),
});

const treasureCardsSchema = z.array(treasureCardSchema).length(homepageTreasureCardIds.length).superRefine((cards, context) => {
  const ids = new Set(cards.map((card) => card.id));
  if (ids.size !== homepageTreasureCardIds.length || homepageTreasureCardIds.some((id) => !ids.has(id))) {
    context.addIssue({ code: "custom", message: "تصاویر کارت‌های گنجینه کامل یا معتبر نیستند." });
  }
});

const safeHrefSchema = z.string().trim().min(1).max(500).refine(
  (value) => (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value)),
  "لینک دکمه باید یک مسیر داخلی یا نشانی امن HTTPS باشد.",
);
const optionalSafeHrefSchema = z.union([z.null(), z.literal(""), safeHrefSchema]).transform((value) => value || null);

const homepageMenuItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  href: safeHrefSchema,
});
export type HomepageMenuItem = z.infer<typeof homepageMenuItemSchema>;

const homepageMenuItemsSchema = z.array(homepageMenuItemSchema).max(20).refine(
  (items) => new Set(items.map((item) => item.id)).size === items.length,
  "شناسه آیتم‌های منوی بالا نباید تکراری باشد.",
);

const homepageTileSchema = z.object({
  id: z.string().trim().min(1).max(80),
  mediaId: z.string().trim().min(1).nullable(),
  href: safeHrefSchema,
});

const homepageTileGroupSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[^:]+$/, "شناسه ردیف تایل معتبر نیست."),
  layout: z.enum(homepageTileLayouts),
  tiles: z.array(homepageTileSchema).max(24).refine(
    (tiles) => new Set(tiles.map((tile) => tile.id)).size === tiles.length,
    "شناسه تایل‌های هر ردیف نباید تکراری باشد.",
  ),
});

const homepageTileGroupsSchema = z.array(homepageTileGroupSchema).max(12).refine(
  (groups) => new Set(groups.map((group) => group.id)).size === groups.length,
  "شناسه ردیف‌های تایل نباید تکراری باشد.",
);

const homepageLicenseSchema = z.object({
  id: z.enum(homepageLicenseIds),
  mediaId: z.string().trim().min(1).nullable(),
  href: optionalSafeHrefSchema,
});

const homepageLicensesSchema = z.array(homepageLicenseSchema).length(homepageLicenseIds.length).superRefine((licenses, context) => {
  const ids = new Set(licenses.map((license) => license.id));
  if (ids.size !== homepageLicenseIds.length || homepageLicenseIds.some((id) => !ids.has(id))) {
    context.addIssue({ code: "custom", message: "تنظیمات مجوزهای فروشگاه کامل یا معتبر نیست." });
  }
});

const heroSlideSchema = z.object({
  id: z.string().trim().min(1).max(80),
  desktopMediaId: z.string().trim().min(1).nullable(),
  mobileMediaId: z.string().trim().min(1).nullable(),
  href: safeHrefSchema,
});

const heroSlidesSchema = z.array(heroSlideSchema).max(10).refine(
  (slides) => new Set(slides.map((slide) => slide.id)).size === slides.length,
  "شناسه اسلایدها نباید تکراری باشد.",
);

const storedHeroSlidesSchema = z.array(heroSlideSchema.extend({ href: safeHrefSchema.optional() })).max(10).refine(
  (slides) => new Set(slides.map((slide) => slide.id)).size === slides.length,
  "شناسه اسلایدها نباید تکراری باشد.",
);

function homepageBaseSectionIds(industry: "GOLD" | "GENERAL"): HomepageSectionId[] {
  return industry === "GENERAL"
    ? ["HERO", "FEATURED_PRODUCTS", "ABOUT", "POPULAR_PRODUCTS", "LATEST_PRODUCTS", "PROMISES", "CONCIERGE"]
    : ["HERO", "LATEST_PRODUCTS", "ABOUT", "PROMISES", "CONCIERGE"];
}

function normalizeStoredSections(value: unknown, industry: "GOLD" | "GENERAL", tileGroups: z.infer<typeof homepageTileGroupsSchema>) {
  const parsed = z.array(z.object({ id: z.string(), enabled: z.boolean() })).max(40).safeParse(value);
  const stored = parsed.success ? parsed.data : [];
  const tileIds = tileGroups.map((group) => `TILE_GROUP:${group.id}` as const);
  const allowed = new Set<string>([...homepageBaseSectionIds(industry), ...tileIds]);
  const expanded = stored.flatMap((section) => {
    if (section.id === "TILES") return tileIds.map((id) => ({ id, enabled: section.enabled }));
    if (section.id === "PRODUCTS") {
      const productIds: HomepageSectionId[] = industry === "GENERAL" ? ["FEATURED_PRODUCTS", "POPULAR_PRODUCTS", "LATEST_PRODUCTS"] : ["LATEST_PRODUCTS"];
      return productIds.map((id) => ({ id, enabled: section.enabled }));
    }
    return [section];
  }).filter((section) => allowed.has(section.id));
  const unique = expanded.filter((section, index) => expanded.findIndex((item) => item.id === section.id) === index);
  const defaults: HomepageLayoutItemId[] = ["HERO", ...tileIds, ...homepageBaseSectionIds(industry).filter((id) => id !== "HERO")];
  return [
    ...unique,
    ...defaults.filter((id) => !unique.some((section) => section.id === id)).map((id) => ({ id, enabled: true })),
  ];
}

const homepageOverviewSettingsObjectSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(40).superRefine((sections, context) => {
    const ids = new Set(sections.map((section) => section.id));
    if (ids.size !== sections.length) {
      context.addIssue({ code: "custom", message: "آیتم‌های چینش صفحه اصلی نباید تکراری باشند." });
    }
  }),
  menuItems: homepageMenuItemsSchema,
  tileGroups: homepageTileGroupsSchema,
  treasureCards: treasureCardsSchema,
  licenses: homepageLicensesSchema,
  promoBannerEnabled: z.boolean(),
  promoBannerHref: optionalSafeHrefSchema,
  promoDesktopMediaId: z.string().trim().min(1).nullable(),
  promoMobileMediaId: z.string().trim().min(1).nullable(),
});

function validateTileGroupLayout(value: { sections: z.infer<typeof sectionSchema>[]; tileGroups: z.infer<typeof homepageTileGroupsSchema> }, context: z.RefinementCtx) {
  const layoutTileIds = value.sections.filter((section) => section.id.startsWith("TILE_GROUP:")).map((section) => section.id.slice("TILE_GROUP:".length));
  const tileGroupIds = value.tileGroups.map((group) => group.id);
  if (layoutTileIds.length !== tileGroupIds.length || tileGroupIds.some((id) => !layoutTileIds.includes(id))) {
    context.addIssue({ code: "custom", path: ["sections"], message: "هر ردیف تایل باید دقیقاً یک جایگاه مستقل در چینش صفحه اصلی داشته باشد." });
  }
}

export const homepageOverviewSettingsInputSchema = homepageOverviewSettingsObjectSchema.superRefine(validateTileGroupLayout);

export const homepageMainSettingsInputSchema = homepageOverviewSettingsObjectSchema.omit({ sections: true, tileGroups: true });

export const homepageTilesSettingsInputSchema = z.object({
  sections: homepageOverviewSettingsObjectSchema.shape.sections,
  tileGroups: homepageOverviewSettingsObjectSchema.shape.tileGroups,
}).superRefine(validateTileGroupLayout);

export const homepageLayoutSettingsInputSchema = z.object({
  sections: homepageOverviewSettingsObjectSchema.shape.sections,
});

export const homepageHeroSettingsInputSchema = z.object({
  heroSlides: heroSlidesSchema,
  heroContentMode: z.enum(["WITH_CONTENT", "IMAGE_ONLY"]),
  heroTitle: z.string().trim().min(2).max(191),
  heroDescription: z.string().trim().min(10).max(500),
  heroButtonLabel: z.string().trim().min(2).max(80),
  heroButtonHref: safeHrefSchema,
  heroDesktopMediaId: z.string().trim().min(1).nullable(),
  heroMobileMediaId: z.string().trim().min(1).nullable(),
});

export const homepageSettingsInputSchema = z.object({
  ...homepageOverviewSettingsObjectSchema.shape,
  ...homepageHeroSettingsInputSchema.shape,
}).superRefine(validateTileGroupLayout);

const mediaSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  alt: z.string().nullable(),
  url: z.string(),
  type: z.literal("IMAGE"),
  mimeType: z.string(),
});

export const homepageSettingsSchema = homepageSettingsInputSchema.safeExtend({
  tileGroups: z.array(homepageTileGroupSchema.extend({ tiles: z.array(homepageTileSchema.extend({ media: mediaSchema.nullable() })).max(24) })).max(12),
  treasureCards: z.array(treasureCardSchema.extend({ media: mediaSchema.nullable() })).length(homepageTreasureCardIds.length),
  licenses: z.array(homepageLicenseSchema.extend({ media: mediaSchema.nullable() })).length(homepageLicenseIds.length),
  heroSlides: z.array(heroSlideSchema.extend({ desktopMedia: mediaSchema.nullable(), mobileMedia: mediaSchema.nullable() })).max(10),
  heroDesktopMedia: mediaSchema.nullable(),
  heroMobileMedia: mediaSchema.nullable(),
  promoDesktopMedia: mediaSchema.nullable(),
  promoMobileMedia: mediaSchema.nullable(),
});

export type HomepageSettingsInput = z.infer<typeof homepageSettingsInputSchema>;
export type HomepageSettings = z.infer<typeof homepageSettingsSchema>;

export const homepageSettingsDefaults: HomepageSettingsInput = {
  sections: homepageBaseSectionIds("GOLD").map((id) => ({ id, enabled: true })),
  menuItems: [],
  tileGroups: [],
  treasureCards: homepageTreasureCardIds.map((id) => ({ id, mediaId: null })),
  licenses: homepageLicenseIds.map((id) => ({ id, mediaId: null, href: null })),
  heroSlides: [],
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

export const generalHomepageSettingsDefaults: HomepageSettingsInput = {
  ...homepageSettingsDefaults,
  heroTitle: "خرید ساده، انتخاب مطمئن",
  heroDescription: "محصولات موردنیازتان را با موجودی به‌روز، قیمت شفاف و ارسال قابل پیگیری انتخاب کنید.",
  heroButtonLabel: "مشاهده محصولات",
};

export function homepageSettingsToInput(settings: HomepageSettings): HomepageSettingsInput {
  return {
    sections: settings.sections,
    menuItems: settings.menuItems,
    tileGroups: settings.tileGroups.map((group) => ({ ...group, tiles: group.tiles.map(({ id, mediaId, href }) => ({ id, mediaId, href })) })),
    treasureCards: settings.treasureCards.map(({ id, mediaId }) => ({ id, mediaId })),
    licenses: settings.licenses.map(({ id, mediaId, href }) => ({ id, mediaId, href })),
    heroSlides: settings.heroSlides.map(({ id, desktopMediaId, mobileMediaId, href }) => ({ id, desktopMediaId, mobileMediaId, href })),
    heroContentMode: settings.heroContentMode,
    heroTitle: settings.heroTitle,
    heroDescription: settings.heroDescription,
    heroButtonLabel: settings.heroButtonLabel,
    heroButtonHref: settings.heroButtonHref,
    heroDesktopMediaId: settings.heroDesktopMediaId,
    heroMobileMediaId: settings.heroMobileMediaId,
    promoBannerEnabled: settings.promoBannerEnabled,
    promoBannerHref: settings.promoBannerHref,
    promoDesktopMediaId: settings.promoDesktopMediaId,
    promoMobileMediaId: settings.promoMobileMediaId,
  };
}

const homepageMediaSelect = { id: true, title: true, alt: true, url: true, type: true, mimeType: true } as const;

const homepageSelect = {
  industry: true,
  generalHomepageSettings: true,
  homepageSections: true,
  menuCategoryIds: true,
  homepageTreasureCards: true,
  homepageTileGroups: true,
  homepageHeroSlides: true,
  homepageLicenses: true,
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
} as const;

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const existing = await db.storeSetting.findUnique({ where: { id: STORE_SETTING_ID }, select: homepageSelect });
  const { sections, menuItems: defaultMenuItems, tileGroups: defaultTileGroups, treasureCards: defaultTreasureCards, heroSlides: defaultHeroSlides, licenses: defaultLicenses, ...homepageDefaults } = homepageSettingsDefaults;
  const settings = existing ?? await db.storeSetting.upsert({
    where: { id: STORE_SETTING_ID },
    create: { id: STORE_SETTING_ID, ...homepageDefaults, menuCategoryIds: defaultMenuItems, homepageSections: sections, homepageTileGroups: defaultTileGroups, homepageTreasureCards: defaultTreasureCards, homepageHeroSlides: defaultHeroSlides, homepageLicenses: defaultLicenses },
    update: {},
    select: homepageSelect,
  });

  let activeSettings: HomepageSettingsInput;
  if (settings.industry === "GENERAL") {
    const stored = settings.generalHomepageSettings && typeof settings.generalHomepageSettings === "object" && !Array.isArray(settings.generalHomepageSettings)
      ? settings.generalHomepageSettings as Record<string, unknown>
      : {};
    const legacyMenuItems = await resolveLegacyMenuItems(stored.menuCategoryIds);
    const parsed = homepageSettingsInputSchema.safeParse({
      ...generalHomepageSettingsDefaults,
      ...stored,
      menuItems: homepageMenuItemsSchema.safeParse(stored.menuItems).data ?? legacyMenuItems,
      tileGroups: homepageTileGroupsSchema.safeParse(stored.tileGroups).data ?? [],
      sections: normalizeStoredSections(stored.sections, "GENERAL", homepageTileGroupsSchema.safeParse(stored.tileGroups).data ?? []),
    });
    activeSettings = parsed.success ? parsed.data : generalHomepageSettingsDefaults;
  } else {
    const parsedHeroSlides = storedHeroSlidesSchema.safeParse(settings.homepageHeroSlides);
    const heroSlides = parsedHeroSlides.success
      ? parsedHeroSlides.data.map((slide) => ({ ...slide, href: slide.href ?? settings.heroButtonHref }))
      : settings.heroDesktopMediaId
        ? [{ id: "legacy-slide", desktopMediaId: settings.heroDesktopMediaId, mobileMediaId: settings.heroMobileMediaId, href: settings.heroButtonHref }]
        : [];
    activeSettings = homepageSettingsInputSchema.parse({
      sections: normalizeStoredSections(settings.homepageSections, "GOLD", homepageTileGroupsSchema.safeParse(settings.homepageTileGroups).data ?? homepageSettingsDefaults.tileGroups),
      menuItems: homepageMenuItemsSchema.safeParse(settings.menuCategoryIds).data ?? await resolveLegacyMenuItems(settings.menuCategoryIds),
      tileGroups: homepageTileGroupsSchema.safeParse(settings.homepageTileGroups).data ?? homepageSettingsDefaults.tileGroups,
      treasureCards: treasureCardsSchema.safeParse(settings.homepageTreasureCards).data ?? homepageSettingsDefaults.treasureCards,
      licenses: homepageLicensesSchema.safeParse(settings.homepageLicenses).data ?? homepageSettingsDefaults.licenses,
      heroSlides,
      heroContentMode: settings.heroContentMode,
      heroTitle: settings.heroTitle,
      heroDescription: settings.heroDescription,
      heroButtonLabel: settings.heroButtonLabel,
      heroButtonHref: settings.heroButtonHref,
      heroDesktopMediaId: settings.heroDesktopMediaId,
      heroMobileMediaId: settings.heroMobileMediaId,
      promoBannerEnabled: settings.promoBannerEnabled,
      promoBannerHref: settings.promoBannerHref,
      promoDesktopMediaId: settings.promoDesktopMediaId,
      promoMobileMediaId: settings.promoMobileMediaId,
    });
  }

  const mediaIds = [...new Set([
    activeSettings.heroDesktopMediaId,
    activeSettings.heroMobileMediaId,
    activeSettings.promoDesktopMediaId,
    activeSettings.promoMobileMediaId,
    ...activeSettings.treasureCards.map((card) => card.mediaId),
    ...activeSettings.licenses.map((license) => license.mediaId),
    ...activeSettings.tileGroups.flatMap((group) => group.tiles.map((tile) => tile.mediaId)),
    ...activeSettings.heroSlides.flatMap((slide) => [slide.desktopMediaId, slide.mobileMediaId]),
  ].filter((id): id is string => Boolean(id)))];
  const media = mediaIds.length ? await db.mediaAsset.findMany({
    where: { id: { in: mediaIds }, scope: "HOMEPAGE", type: "IMAGE" },
    select: homepageMediaSelect,
  }) : [];
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const resolveMedia = (id: string | null) => id ? mediaById.get(id) ?? null : null;

  return homepageSettingsSchema.parse({
    ...activeSettings,
    tileGroups: activeSettings.tileGroups.map((group) => ({ ...group, tiles: group.tiles.map((tile) => ({ ...tile, media: resolveMedia(tile.mediaId) })) })),
    treasureCards: activeSettings.treasureCards.map((card) => ({ ...card, media: resolveMedia(card.mediaId) })),
    licenses: activeSettings.licenses.map((license) => ({ ...license, media: resolveMedia(license.mediaId) })),
    heroSlides: activeSettings.heroSlides.map((slide) => ({ ...slide, desktopMedia: resolveMedia(slide.desktopMediaId), mobileMedia: resolveMedia(slide.mobileMediaId) })),
    heroDesktopMedia: resolveMedia(activeSettings.heroDesktopMediaId),
    heroMobileMedia: resolveMedia(activeSettings.heroMobileMediaId),
    promoDesktopMedia: resolveMedia(activeSettings.promoDesktopMediaId),
    promoMobileMedia: resolveMedia(activeSettings.promoMobileMediaId),
  });
}

export type HomepageMenuLinkOption = {
  id: string;
  label: string;
  href: string;
  group: "پیشنهادی" | "دسته‌بندی‌ها";
};

async function resolveLegacyMenuItems(value: unknown) {
  const parsed = z.array(z.string().trim().min(1)).max(20).safeParse(value);
  if (!parsed.success || !parsed.data.length) return [];
  const categories = await db.category.findMany({
    where: { id: { in: parsed.data }, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });
  const byId = new Map(categories.map((category) => [category.id, category]));
  return parsed.data.flatMap((id) => {
    const category = byId.get(id);
    return category ? [{ id: `legacy-${category.id}`, label: category.name, href: `/products?category=${category.slug}` }] : [];
  });
}

export async function getHomepageMenuLinkOptions(): Promise<HomepageMenuLinkOption[]> {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });
  const suggested: HomepageMenuLinkOption[] = [
    { id: "home", label: "صفحه اصلی", href: "/", group: "پیشنهادی" },
    { id: "products", label: "همه محصولات", href: "/products", group: "پیشنهادی" },
    { id: "about", label: "درباره ما", href: "/pages/about", group: "پیشنهادی" },
    { id: "contact", label: "تماس با ما", href: "/pages/contact", group: "پیشنهادی" },
    { id: "faq", label: "سوالات متداول", href: "/pages/faq", group: "پیشنهادی" },
    { id: "cart", label: "سبد خرید", href: "/cart", group: "پیشنهادی" },
  ];
  return [...suggested, ...categories.map((category) => ({ id: `category-${category.id}`, label: category.name, href: `/products?category=${category.slug}`, group: "دسته‌بندی‌ها" as const }))];
}
