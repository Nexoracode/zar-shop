"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { Monitor, Smartphone } from "lucide-react";
import type { HomepageLayoutItemId, HomepageSectionId, HomepageSettings } from "@/modules/settings/homepage-settings";

type PreviewMode = "desktop" | "mobile";

const sectionNames: Partial<Record<HomepageLayoutItemId, string>> = {
  HERO: "اسلایدر",
  CATEGORIES: "دسته‌بندی‌های دایره‌ای",
  BRANDS: "محبوب‌ترین برندها",
  FEATURED_PRODUCTS: "شگفت‌انگیزها",
  POPULAR_PRODUCTS: "محبوب‌ترین‌ها",
  BEST_SELLING_PRODUCTS: "پرفروش‌ترین‌ها",
  LATEST_PRODUCTS: "جدیدترین‌ها",
  ABOUT: "معرفی فروشگاه",
  PROMISES: "مزیت‌های خرید",
  CONCIERGE: "خدمات و سوالات",
};

export function HomepageLayoutPreview({ sections, settings }: { sections: HomepageSettings["sections"]; settings: HomepageSettings }) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const enabledSections = sections.filter((section) => section.enabled);
  const tileGroups = new Map(settings.tileGroups.map((group) => [group.id, group]));
  const desktopHeroMedia = settings.heroSlides[0]?.desktopMedia ?? settings.heroDesktopMedia;
  const heroMedia = mode === "mobile" ? settings.heroSlides[0]?.mobileMedia ?? settings.heroMobileMedia ?? desktopHeroMedia : desktopHeroMedia;

  return <div className="xl:sticky xl:top-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div><strong className="block text-xs">پیش‌نمایش زنده</strong><span className="mt-1 block text-[10px] text-[var(--muted)]">قبل از ذخیره، ترتیب جدید را اینجا ببینید.</span></div>
      <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-1">
        <Button type="button" isIconOnly size="sm" variant={mode === "desktop" ? "primary" : "ghost"} aria-label="پیش‌نمایش دسکتاپ" onPress={() => setMode("desktop")}><Monitor size={14} /></Button>
        <Button type="button" isIconOnly size="sm" variant={mode === "mobile" ? "primary" : "ghost"} aria-label="پیش‌نمایش موبایل" onPress={() => setMode("mobile")}><Smartphone size={14} /></Button>
      </div>
    </div>
    <Card variant="secondary" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#e9eaed] p-2 shadow-inner">
      <div className={`mx-auto overflow-hidden rounded-lg border border-black/10 bg-[#f5f5f5] shadow-sm transition-all duration-300 ${mode === "mobile" ? "w-[220px]" : "w-full"}`}>
        <div className="flex h-5 items-center gap-1 border-b border-black/5 bg-white px-2"><span className="size-1.5 rounded-full bg-rose-300" /><span className="size-1.5 rounded-full bg-amber-300" /><span className="size-1.5 rounded-full bg-emerald-300" /><span className="mr-2 h-1.5 flex-1 rounded-full bg-slate-100" /></div>
        <div className="flex items-center justify-between bg-white px-2 py-1.5"><span className="h-2 w-8 rounded-full bg-[var(--accent)]/60" /><span className="flex gap-1"><i className="h-1.5 w-8 rounded-full bg-slate-200" /><i className="h-1.5 w-5 rounded-full bg-slate-200" /><i className="h-1.5 w-6 rounded-full bg-slate-200" /></span></div>
        <div className="grid gap-1.5 p-1.5">
          {enabledSections.map((section) => {
            if (section.id.startsWith("TILE_GROUP:")) {
              const group = tileGroups.get(section.id.slice("TILE_GROUP:".length));
              if (!group) return null;
              const tiles = group.tiles.filter((tile) => tile.media);
              if (!tiles.length) return null;
              const columns = mode === "mobile"
                ? group.layout === "FOUR_COLUMNS" || group.layout === "TWO_BY_TWO" ? "grid-cols-2" : "grid-cols-1"
                : group.layout === "THREE_COLUMNS" ? "grid-cols-3" : group.layout === "FOUR_COLUMNS" ? "grid-cols-4" : "grid-cols-2";
              const compact = group.layout === "TWO_COLUMNS" || group.layout === "TWO_BY_TWO";
              return <PreviewBlock key={section.id} label={`ردیف تایل ${settings.tileGroups.findIndex((item) => item.id === group.id) + 1}`}><div className={`grid gap-1 ${columns}`}>{tiles.map((tile) => <span key={tile.id} className={`relative overflow-hidden rounded bg-slate-200 ${compact ? mode === "mobile" ? "aspect-[2.15/1]" : "aspect-[2.6/1]" : "aspect-[16/9]"}`}><Image src={tile.media!.url} alt={tile.media!.alt ?? tile.media!.title ?? "تایل"} fill sizes="160px" className="object-cover" /></span>)}</div></PreviewBlock>;
            }
            return <PreviewSection key={section.id} id={section.id as HomepageSectionId} mode={mode} heroUrl={heroMedia?.url ?? null} />;
          })}
          {enabledSections.length === 0 && <div className="grid min-h-32 place-items-center text-[9px] text-slate-400">همه بخش‌ها غیرفعال هستند</div>}
        </div>
      </div>
    </Card>
  </div>;
}

function PreviewBlock({ label, children, tone = "bg-white" }: { label: string; children: React.ReactNode; tone?: string }) {
  return <section className={`rounded-md border border-black/5 p-1.5 ${tone}`}><div className="mb-1 flex items-center justify-between"><span className="text-[7px] font-bold text-slate-500">{label}</span><Chip size="sm" variant="soft" className="h-3 min-h-3 px-1 text-[6px]"><Chip.Label>بخش</Chip.Label></Chip></div>{children}</section>;
}

function ProductShapes({ count = 4 }: { count?: number }) {
  return <div className="grid grid-cols-4 gap-1">{Array.from({ length: count }, (_, index) => <span key={index} className="grid gap-0.5"><i className="aspect-square rounded bg-slate-200" /><i className="h-1 rounded-full bg-slate-200" /><i className="h-1 w-2/3 rounded-full bg-amber-300" /></span>)}</div>;
}

function PreviewSection({ id, mode, heroUrl }: { id: HomepageSectionId; mode: PreviewMode; heroUrl: string | null }) {
  if (id === "HERO") return <section className={`relative overflow-hidden rounded-md bg-slate-300 ${mode === "mobile" ? "aspect-[4/3]" : "aspect-[3.2/1]"}`}>{heroUrl && <Image src={heroUrl} alt="پیش‌نمایش اسلایدر" fill sizes="420px" className="object-cover" />}<span className="absolute inset-0 bg-gradient-to-l from-black/30 to-transparent" /><span className="absolute right-2 top-1/2 grid -translate-y-1/2 gap-1"><i className="h-2 w-16 rounded-full bg-white/90" /><i className="h-1 w-20 rounded-full bg-white/60" /><i className="h-3 w-9 rounded bg-[var(--accent)]" /></span></section>;
  if (id === "CATEGORIES") return <PreviewBlock label={sectionNames[id]!}><div className={`grid gap-1 ${mode === "mobile" ? "grid-cols-5" : "grid-cols-8"}`}>{Array.from({ length: mode === "mobile" ? 5 : 8 }, (_, index) => <span key={index} className="grid justify-items-center gap-0.5"><i className="aspect-square w-full rounded-full bg-slate-200" /><i className="h-1 w-3/4 rounded-full bg-slate-200" /></span>)}</div></PreviewBlock>;
  if (id === "BRANDS") return <PreviewBlock label={sectionNames[id]!}><div className={`grid gap-1 ${mode === "mobile" ? "grid-cols-4" : "grid-cols-7"}`}>{Array.from({ length: mode === "mobile" ? 4 : 7 }, (_, index) => <i key={index} className="aspect-square rounded border border-black/5 bg-slate-100" />)}</div></PreviewBlock>;
  if (id === "FEATURED_PRODUCTS") return <PreviewBlock label={sectionNames[id]!} tone="bg-rose-100"><ProductShapes count={4} /></PreviewBlock>;
  if (id === "BEST_SELLING_PRODUCTS") return <PreviewBlock label={sectionNames[id]!}><div className="grid grid-cols-4 gap-1">{Array.from({ length: 12 }, (_, index) => <span key={index} className="flex items-center gap-0.5"><i className="size-2.5 shrink-0 rounded bg-slate-200" /><i className="grid size-1.5 shrink-0 place-items-center rounded-full bg-rose-400 text-[3px] text-white">{index + 1}</i><i className="h-1 flex-1 rounded-full bg-slate-200" /></span>)}</div></PreviewBlock>;
  if (id === "POPULAR_PRODUCTS" || id === "LATEST_PRODUCTS") return <PreviewBlock label={sectionNames[id]!}><ProductShapes count={4} /></PreviewBlock>;
  if (id === "ABOUT") return <PreviewBlock label={sectionNames[id]!}><div className="grid grid-cols-2 gap-1"><span className="h-10 rounded bg-amber-100" /><span className="h-10 rounded bg-slate-200" /></div></PreviewBlock>;
  if (id === "PROMISES") return <PreviewBlock label={sectionNames[id]!}><div className="grid grid-cols-4 gap-1">{Array.from({ length: 4 }, (_, index) => <span key={index} className="h-6 rounded bg-slate-100" />)}</div></PreviewBlock>;
  return <PreviewBlock label={sectionNames[id] ?? "خدمات و سوالات"}><div className="grid gap-1">{Array.from({ length: 3 }, (_, index) => <span key={index} className="h-2 rounded bg-slate-100" />)}</div></PreviewBlock>;
}
