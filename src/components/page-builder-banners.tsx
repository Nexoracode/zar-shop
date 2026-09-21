"use client";

import { useState } from "react";
import { BannerItemDialog } from "@/components/banner-item-dialog";
import { BannerLayoutPicker } from "@/components/banner-layout-picker";
import { SectionEditDialog } from "@/components/section-edit-dialog";
import { bannerLayoutLabels, bannerLayouts, bannerSliderLayouts, bannerSliderMaxSlides, bannerTileCount, bannerTileLayouts, isTileLayout, type BannerLayout } from "@/modules/page-builder/banners";
import { resizeBannerItems, type BannerItem, type BannerSet, type TileGroupView } from "@/modules/page-builder/banner-items";
import type { EditItem } from "@/modules/page-builder/edit-items";
import { heroImageSizeHints, heroSlideLabel, type HeroValues } from "@/modules/page-builder/hero-payload";

export type SliderView = { layout: BannerLayout; items: BannerItem[] };

/** The list of a banner set and the forms behind it: its banners, its look and (on sliders) adding a banner. */
function BannerEditFlow({ set, onClose }: { set: BannerSet; onClose: () => void }) {
  const [step, setStep] = useState<"list" | "layout" | { itemId: string | null }>("list");
  const fixedSize = set.kind === "tiles";
  const capacity = fixedSize && isTileLayout(set.layout) ? bannerTileCount[set.layout] : bannerSliderMaxSlides;
  const rows: EditItem[] = [
    ...(set.kind === "hero" ? [] : [{ id: "layout", title: "تغییر ظاهر بنر", description: `ظاهر فعلی: ${bannerLayoutLabels[set.layout]}`, icon: "list" as const }]),
    ...set.items.map((item, index) => ({ id: `item:${item.id}`, title: heroSlideLabel(index), description: item.desktopMedia ? "برای ویرایش بنر کلیک کنید." : "این بنر هنوز تصویر ندارد؛ برای افزودن کلیک کنید.", icon: "image" as const })),
  ];
  const sizeHints = set.kind === "tiles" ? undefined : heroImageSizeHints;

  function changeLayout(layout: BannerLayout) {
    const items = isTileLayout(layout) ? resizeBannerItems(set.items, bannerTileCount[layout], () => crypto.randomUUID()) : set.items;
    set.save(items, layout);
    setStep("list");
  }

  if (step === "layout") {
    return <BannerLayoutPicker title="تغییر ظاهر بنر" layouts={set.kind === "tiles" ? bannerTileLayouts : bannerSliderLayouts} initial={set.layout} saving={false} onConfirm={changeLayout} onBack={() => setStep("list")} onClose={onClose} />;
  }
  if (typeof step === "object") {
    return <BannerItemDialog key={step.itemId ?? "new"} items={set.items} itemId={step.itemId} allowMobile={set.kind !== "tiles"} allowDelete={!fixedSize} maxItems={fixedSize ? null : capacity} sizeHints={sizeHints} save={(items) => set.save(items, set.layout)} onSaved={() => setStep("list")} onBack={() => setStep("list")} onClose={onClose} />;
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
 * slider (all the same list and forms), and adding a new banner section in any of the twelve looks. Nothing here
 * touches the server or the page's layout: every change is handed to the builder (`onChange` / `onCreate`), which keeps
 * it in its draft until "save". The banners it is given already include the draft's edits.
 */
export function PageBuilderBanners({ hero, tileGroups, sliders, editSectionId, adding, onEditClose, onAddBack, onAddClose, onCreate, onChange }: {
  hero: HeroValues;
  tileGroups: TileGroupView[];
  /** The added sliders (saved and pending alike) by section id. */
  sliders: Record<string, SliderView>;
  editSectionId: string | null;
  adding: boolean;
  onEditClose: () => void;
  onAddBack: () => void;
  onAddClose: () => void;
  /** A look was chosen for a new banner. */
  onCreate: (layout: BannerLayout) => void;
  /** A banner set's look or banners changed (the id is the section's). */
  onChange: (sectionId: string, view: SliderView) => void;
}) {
  function setFor(id: string | null): BannerSet | null {
    if (id === "HERO") return { id, kind: "hero", layout: "SLIDER_FULL", items: hero.slides, save: (items, layout) => onChange(id, { layout, items }) };
    if (id?.startsWith("TILE_GROUP:")) {
      const group = tileGroups.find((item) => `TILE_GROUP:${item.id}` === id);
      if (!group || !isTileLayout(group.layout)) return null;
      return { id, kind: "tiles", layout: group.layout, items: group.items, save: (items, layout) => onChange(id, { layout, items }) };
    }
    if (id?.startsWith("BANNER_SLIDER:")) {
      const slider = sliders[id];
      if (!slider) return null;
      return { id, kind: isTileLayout(slider.layout) ? "tiles" : "slider", layout: slider.layout, items: slider.items, save: (items, layout) => onChange(id, { layout, items }) };
    }
    return null;
  }

  const editSet = setFor(editSectionId);
  return (
    <>
      {editSet && <BannerEditFlow key={editSet.id} set={editSet} onClose={onEditClose} />}
      {adding && <BannerLayoutPicker title="افزودن بنر" layouts={bannerLayouts} saving={false} onConfirm={onCreate} onBack={onAddBack} onClose={onAddClose} />}
    </>
  );
}
