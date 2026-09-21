"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { BannerItemDialog } from "@/components/banner-item-dialog";
import { BannerLayoutPicker } from "@/components/banner-layout-picker";
import { SectionEditDialog } from "@/components/section-edit-dialog";
import { bannerLayoutLabels, bannerLayouts, bannerSliderLayouts, bannerSliderMaxSlides, bannerTileCount, bannerTileLayouts, isTileLayout, type BannerLayout } from "@/modules/page-builder/banners";
import { resizeBannerItems, sliderConfigPayload, tileGroupsPayload, type BannerItem, type BannerSet, type TileGroupView } from "@/modules/page-builder/banner-items";
import type { EditItem } from "@/modules/page-builder/edit-items";
import { heroImageSizeHints, heroSettingsPayload, heroSlideLabel, type HeroValues } from "@/modules/page-builder/hero-payload";
import type { LayoutSection } from "@/modules/page-builder/layout-draft";

async function request(url: string, method: "POST" | "PATCH", body: unknown, fallback: string) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? fallback);
  return result;
}

export type SliderView = { layout: BannerLayout; items: BannerItem[] };

/** The list of a banner set and the forms behind it: its banners, its look and (on sliders) adding a banner. */
function BannerEditFlow({ set, onChanged, onClose }: { set: BannerSet; onChanged: () => void; onClose: () => void }) {
  const [step, setStep] = useState<"list" | "layout" | { itemId: string | null }>("list");
  const [changingLayout, setChangingLayout] = useState(false);
  const fixedSize = set.kind === "tiles";
  const capacity = fixedSize && isTileLayout(set.layout) ? bannerTileCount[set.layout] : bannerSliderMaxSlides;
  const rows: EditItem[] = [
    ...(set.kind === "hero" ? [] : [{ id: "layout", title: "تغییر ظاهر بنر", description: `ظاهر فعلی: ${bannerLayoutLabels[set.layout]}`, icon: "list" as const }]),
    ...set.items.map((item, index) => ({ id: `item:${item.id}`, title: heroSlideLabel(index), description: item.desktopMedia ? "برای ویرایش بنر کلیک کنید." : "این بنر هنوز تصویر ندارد؛ برای افزودن کلیک کنید.", icon: "image" as const })),
  ];
  const sizeHints = set.kind === "tiles" ? undefined : heroImageSizeHints;

  async function changeLayout(layout: BannerLayout) {
    setChangingLayout(true);
    try {
      const items = isTileLayout(layout) ? resizeBannerItems(set.items, bannerTileCount[layout], () => crypto.randomUUID()) : set.items;
      await set.save(items, layout);
      if (!set.local) {
        toast.success("ظاهر بنر ذخیره شد");
        onChanged();
      }
      setStep("list");
    } catch (reason) {
      toast.danger("تغییر ظاهر بنر انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setChangingLayout(false);
    }
  }

  if (step === "layout") {
    return <BannerLayoutPicker title="تغییر ظاهر بنر" layouts={set.kind === "tiles" ? bannerTileLayouts : bannerSliderLayouts} initial={set.layout} saving={changingLayout} onConfirm={(layout) => void changeLayout(layout)} onBack={() => setStep("list")} onClose={onClose} />;
  }
  if (typeof step === "object") {
    return <BannerItemDialog key={step.itemId ?? "new"} items={set.items} itemId={step.itemId} allowMobile={set.kind !== "tiles"} allowDelete={!fixedSize} maxItems={fixedSize ? null : capacity} sizeHints={sizeHints} quiet={set.local} save={(items) => set.save(items, set.layout)} onSaved={() => { if (!set.local) onChanged(); setStep("list"); }} onBack={() => setStep("list")} onClose={onClose} />;
  }
  return (
    <SectionEditDialog
      title="ویرایش بنر"
      items={rows}
      emptyMessage="هنوز بنری ثبت نشده است."
      footerAction={fixedSize ? undefined : { label: "افزودن بنر", disabled: set.items.length >= capacity, onPress: () => setStep({ itemId: null }) }}
      onSelect={(row) => setStep(row.id === "layout" ? "layout" : { itemId: row.id.slice("item:".length) })}
      onClose={onClose}
    />
  );
}

/**
 * Everything the page builder does with banners: editing the banners of the main slider, of a tile row or of an added
 * slider (all the same list and forms, each stored where it lives), and adding a new banner section in any of the
 * eleven looks (a slider or a row of tiles, both stored the same way). Nothing here touches the page draft: a new
 * section is created as a server-side draft and the parent is told, so it can place it and decide its fate — "save"
 * makes it part of the page, "cancel" throws it away.
 */
export function PageBuilderBanners({ hero, tileGroups, sliders, pending, sections, editSectionId, adding, onEditClose, onAddBack, onAddClose, onCreate, onPendingChange, onChanged }: {
  hero: HeroValues;
  tileGroups: TileGroupView[];
  sliders: Record<string, SliderView>;
  /** The banners added in this edit and not saved yet: they live in the builder's draft, so editing them sends nothing. */
  pending: Record<string, SliderView>;
  /** The saved order of the page's sections — the tiles API takes it with the tile rows. */
  sections: LayoutSection[];
  editSectionId: string | null;
  adding: boolean;
  onEditClose: () => void;
  onAddBack: () => void;
  onAddClose: () => void;
  /** A look was chosen for a new banner: the builder adds it to its draft (nothing is stored yet). */
  onCreate: (layout: BannerLayout) => void;
  /** A pending banner's look or banners changed. */
  onPendingChange: (id: string, view: SliderView) => void;
  onChanged: () => void;
}) {
  // What was saved during this visit wins over what the server sent until the page has caught up.
  const [localHero, setLocalHero] = useState<BannerItem[] | null>(null);
  const [localGroups, setLocalGroups] = useState<Record<string, TileGroupView>>({});
  const [localSliders, setLocalSliders] = useState<Record<string, SliderView>>({});

  const groups = [...tileGroups.map((group) => localGroups[group.id] ?? group), ...Object.values(localGroups).filter((group) => !tileGroups.some((known) => known.id === group.id))];
  const allSliders = { ...sliders, ...localSliders, ...pending };

  async function saveTiles(nextGroups: TileGroupView[], nextSections: LayoutSection[]) {
    await request("/api/admin/settings/homepage/tiles", "PATCH", { sections: nextSections, tileGroups: tileGroupsPayload(nextGroups) }, "ذخیرهٔ بنر انجام نشد.");
  }

  function setFor(id: string | null): BannerSet | null {
    if (id === "HERO") {
      const items = localHero ?? hero.slides;
      return { id, kind: "hero", layout: "SLIDER_WIDE", items, save: async (next) => { await request("/api/admin/settings/homepage/hero", "PATCH", heroSettingsPayload(hero, next), "ذخیرهٔ بنر انجام نشد."); setLocalHero(next); } };
    }
    if (id?.startsWith("TILE_GROUP:")) {
      const group = groups.find((item) => `TILE_GROUP:${item.id}` === id);
      if (!group || !isTileLayout(group.layout)) return null;
      return { id, kind: "tiles", layout: group.layout, items: group.items, save: async (items, layout) => {
        const updated = { ...group, layout, items };
        await saveTiles(groups.map((item) => (item.id === group.id ? updated : item)), sections);
        setLocalGroups((current) => ({ ...current, [group.id]: updated }));
      } };
    }
    if (id?.startsWith("BANNER_SLIDER:")) {
      const slider = allSliders[id];
      if (!slider) return null;
      const kind = isTileLayout(slider.layout) ? "tiles" : "slider";
      if (id in pending) return { id, kind, layout: slider.layout, items: slider.items, local: true, save: async (items, layout) => onPendingChange(id, { layout, items }) };
      return { id, kind, layout: slider.layout, items: slider.items, save: async (items, layout) => {
        await request("/api/admin/settings/banner-sliders", "PATCH", { id, config: sliderConfigPayload(layout, items) }, "ذخیرهٔ بنر انجام نشد.");
        setLocalSliders((current) => ({ ...current, [id]: { layout, items } }));
      } };
    }
    return null;
  }

  const editSet = setFor(editSectionId);
  return (
    <>
      {editSet && <BannerEditFlow key={editSet.id} set={editSet} onChanged={onChanged} onClose={onEditClose} />}
      {adding && <BannerLayoutPicker title="افزودن بنر" layouts={bannerLayouts} saving={false} onConfirm={onCreate} onBack={onAddBack} onClose={onAddClose} />}
    </>
  );
}
