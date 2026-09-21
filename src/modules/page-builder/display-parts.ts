import { z } from "zod";
import { BUILDER_SECTION_ATTRIBUTE } from "@/modules/page-builder/sections";

// "Display settings" of a storefront section: the section as a whole can be switched off, and so can each of
// the parts it is made of (search box, cart button, slider arrows…). Only what differs from "everything shown"
// is stored.
export const BUILDER_PART_ATTRIBUTE = "data-builder-part";

export type PageBuilderIndustry = "GOLD" | "GENERAL";
export type DisplayPart = { id: string; label: string };
export type SectionDisplay = { enabled: boolean; hiddenParts: string[] };
export type PageDisplay = Record<string, SectionDisplay>;

export type SectionDisplayConfig = {
  parts: DisplayPart[];
  /** Where the "whole section on/off" switch is stored: here (`display`) or as `enabled` in the homepage layout (`layout`). */
  master: "display" | "layout";
  /** The whole-section switch's wording; a default is used when a section doesn't need its own. */
  masterLabel?: string;
};

// The parts a section can toggle. This must list exactly what the section's template wraps in
// `<BuilderPart>` (see `src/components/builder-part.tsx`); sections without an entry have no display settings yet.
const displaySections: Record<string, { master: "display" | "layout"; masterLabel?: string; parts: Record<PageBuilderIndustry, DisplayPart[]> }> = {
  HEADER: {
    master: "display",
    parts: {
      GENERAL: [
        { id: "logo", label: "لوگو" },
        { id: "search", label: "جستجو" },
        { id: "notifications", label: "اعلان‌ها" },
        { id: "account", label: "ورود / ثبت‌نام و حساب کاربری" },
        { id: "cart", label: "سبد خرید" },
        { id: "delivery", label: "آدرس تحویل" },
        { id: "categories", label: "منوی دسته‌بندی‌ها" },
        { id: "menu", label: "لینک‌های منوی بالا" },
      ],
      GOLD: [
        { id: "goldPrice", label: "قیمت لحظه‌ای طلا" },
        { id: "delivery", label: "آدرس تحویل" },
        { id: "infoLinks", label: "لینک‌های اطلاعاتی" },
        { id: "logo", label: "لوگو" },
        { id: "storeLink", label: "لینک فروشگاه" },
        { id: "menu", label: "لینک‌های منوی بالا" },
        { id: "search", label: "جستجو" },
        { id: "notifications", label: "اعلان‌ها" },
        { id: "account", label: "ورود / ثبت‌نام و حساب کاربری" },
        { id: "cart", label: "سبد خرید" },
      ],
    },
  },
  HERO: {
    master: "layout",
    masterLabel: "نمایش اسلایدر",
    parts: {
      GENERAL: [{ id: "arrows", label: "نمایش فلش‌ها" }],
      GOLD: [{ id: "arrows", label: "نمایش فلش‌ها" }],
    },
  },
};

export function sectionDisplayConfig(sectionId: string, industry: PageBuilderIndustry): SectionDisplayConfig | null {
  const section = displaySections[sectionId];
  return section ? { parts: section.parts[industry], master: section.master, masterLabel: section.masterLabel } : null;
}

const defaultSectionDisplay: SectionDisplay = { enabled: true, hiddenParts: [] };

export function sectionDisplay(display: PageDisplay, sectionId: string): SectionDisplay {
  return display[sectionId] ?? defaultSectionDisplay;
}

export function isSectionEnabled(display: PageDisplay, sectionId: string) {
  return sectionDisplay(display, sectionId).enabled;
}

export function isPartHidden(display: PageDisplay, sectionId: string, partId: string) {
  return sectionDisplay(display, sectionId).hiddenParts.includes(partId);
}

/** Drops sections that are back to the default and orders the rest, so equal settings compare and store equal. */
export function normalizeDisplay(display: PageDisplay): PageDisplay {
  const entries = Object.entries(display)
    .map(([id, entry]) => [id, { enabled: entry.enabled, hiddenParts: [...new Set(entry.hiddenParts)].sort() }] as const)
    .filter(([, entry]) => !entry.enabled || entry.hiddenParts.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

export function sameDisplay(a: PageDisplay, b: PageDisplay) {
  return JSON.stringify(normalizeDisplay(a)) === JSON.stringify(normalizeDisplay(b));
}

export function setSectionDisplay(display: PageDisplay, sectionId: string, next: SectionDisplay): PageDisplay {
  return normalizeDisplay({ ...display, [sectionId]: next });
}

const escapeAttribute = (value: string) => value.replace(/["\\]/g, "\\$&");

/**
 * Applies display settings to the rendered page. Parts are simply hidden. A disabled section is hidden too,
 * except while editing: it stays on screen, faded, so it can still be selected and switched back on.
 * (Sections whose on/off switch lives in the homepage layout are styled by `layoutCss` instead.)
 */
export function displayCss(display: PageDisplay, { editing }: { editing: boolean }) {
  return Object.entries(display).flatMap(([sectionId, entry]) => {
    const rules: string[] = [];
    if (!entry.enabled) rules.push(`[${BUILDER_SECTION_ATTRIBUTE}="${escapeAttribute(sectionId)}"]{${editing ? "opacity:0.35" : "display:none"} !important;}`);
    for (const part of entry.hiddenParts) rules.push(`[${BUILDER_PART_ATTRIBUTE}="${escapeAttribute(`${sectionId}:${part}`)}"]{display:none !important;}`);
    return rules;
  }).join("");
}

const sectionDisplaySchema = z.object({
  enabled: z.boolean(),
  hiddenParts: z.array(z.string().min(1).max(40)).max(40),
});

/** The stored shape, checked for the store's industry: only known sections and known parts of them. */
export function pageDisplaySchema(industry: PageBuilderIndustry) {
  return z.record(z.string().min(1).max(80), sectionDisplaySchema).superRefine((display, context) => {
    for (const [sectionId, entry] of Object.entries(display)) {
      const config = sectionDisplayConfig(sectionId, industry);
      if (!config) {
        context.addIssue({ code: "custom", message: "تنظیمات نمایش برای این بخش تعریف نشده است.", path: [sectionId] });
        continue;
      }
      if (entry.hiddenParts.some((part) => !config.parts.some((known) => known.id === part))) {
        context.addIssue({ code: "custom", message: "یکی از اجزای انتخاب‌شده در این بخش وجود ندارد.", path: [sectionId, "hiddenParts"] });
      }
      // The whole-section switch of these lives in the homepage layout, never here.
      if (config.master === "layout" && !entry.enabled) {
        context.addIssue({ code: "custom", message: "وضعیت فعال بودن این بخش در چینش صفحه اصلی ذخیره می‌شود.", path: [sectionId, "enabled"] });
      }
    }
  }).transform(normalizeDisplay);
}

/** Lenient read of what is stored: anything malformed counts as "nothing customised". */
export function parseStoredDisplay(value: unknown): PageDisplay {
  const parsed = z.record(z.string(), sectionDisplaySchema).safeParse(value);
  return parsed.success ? normalizeDisplay(parsed.data) : {};
}
