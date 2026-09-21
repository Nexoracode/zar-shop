"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { PageBuilderConfirmDialog } from "@/components/page-builder-confirm-dialog";
import { PageBuilderBanners, type SliderView } from "@/components/page-builder-banners";
import { setPendingSections } from "@/components/pending-sections-store";
import { PageBuilderIdentityDialog, type IdentityValues } from "@/components/page-builder-identity-dialog";
import { PageBuilderMenuDialog } from "@/components/page-builder-menu-dialog";
import { PageBuilderOverlay } from "@/components/page-builder-overlay";
import { ProductListDialog, type CategoryOption } from "@/components/product-list-dialog";
import { ProductListLayoutPicker } from "@/components/product-list-layout-picker";
import { SectionContentDialog } from "@/components/section-content-dialog";
import { SectionDisplayDialog } from "@/components/section-display-dialog";
import { SectionEditDialog } from "@/components/section-edit-dialog";
import { displayCss, sameDisplay, sectionDisplay, sectionDisplayConfig, setSectionDisplay, type DynamicDisplayConfig, type PageBuilderIndustry, type PageDisplay, type SectionDisplay, type SectionDisplayConfig } from "@/modules/page-builder/display-parts";
import { sectionEditItems, type EditItem } from "@/modules/page-builder/edit-items";
import type { HeroValues } from "@/modules/page-builder/hero-payload";
import { bannerSliderDisplayConfig, newBannerSliderId } from "@/modules/page-builder/banner-sliders";
import { bannerTileCount, isBannerSectionId, isTileLayout, type BannerLayout } from "@/modules/page-builder/banners";
import { resizeBannerItems, sliderConfigPayload, type TileGroupView } from "@/modules/page-builder/banner-items";
import { pendingInLayout, type PendingSection, type PendingSections } from "@/modules/page-builder/pending-sections";
import { newProductListConfig, newProductListId, productListDisplayConfig, pruneDisplayForList, type ProductListConfig, type ProductListLayout } from "@/modules/page-builder/product-lists";
import { isSectionSettingsId, type PageSectionSettingsBundle } from "@/modules/page-builder/section-settings";
import { insertSection, isLayoutSection, layoutCss, moveSection, removeSection, sameLayout, sectionSelector, type LayoutSection } from "@/modules/page-builder/layout-draft";
import { builderSectionLabel } from "@/modules/page-builder/sections";
import type { HomepageMenuItem, HomepageMenuLinkOption } from "@/modules/settings/homepage-settings";

// Everything the builder can change, kept as one value so undo/redo step through layout and display edits alike.
type Snapshot = { layout: LayoutSection[]; display: PageDisplay };
type Draft = { current: Snapshot; past: Snapshot[]; future: Snapshot[] };

const isRendered = (id: string) => document.querySelector(sectionSelector(id)) !== null;

async function sendJson(method: "POST" | "PATCH", url: string, body: unknown, fallbackMessage: string) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? fallbackMessage);
}

const patchJson = (url: string, body: unknown, fallbackMessage: string) => sendJson("PATCH", url, body, fallbackMessage);

// A section added in this edit is created on the server, under the id it has had in the draft all along, just before
// the layout that contains it is saved (the server keeps it a hidden draft until then).
function createPendingSection(id: string, section: PendingSection) {
  return section.kind === "list"
    ? sendJson("POST", "/api/admin/settings/product-lists", { ...section.config, id }, "ثبت لیست محصولات انجام نشد.")
    : sendJson("POST", "/api/admin/settings/banner-sliders", { ...sliderConfigPayload(section.layout, section.items), id }, "ثبت بنر انجام نشد.");
}

/**
 * Storefront page builder: the bottom dock plus the section-selection layer. The dock only opens a menu;
 * the page goes into edit mode (and the overlay turns on) once "edit page appearance" is pressed.
 *
 * Edits (remove, move up/down, display settings) are a draft over the store's page layout: they show on the page
 * at once through an injected stylesheet, can be undone and redone, and only reach the store on "save". Removing a
 * section asks for confirmation first, because once the change is saved there is no way back.
 */
export function PageBuilder({ initialSections, initialDisplay, industry, identity, menu, hero, sectionSettings, categoryOptions, tileGroups, bannerSliders }: {
  initialSections: LayoutSection[];
  initialDisplay: PageDisplay;
  industry: PageBuilderIndustry;
  /** Current name, tagline and logo, for the header's "name, tagline and logo" form. */
  identity: IdentityValues;
  /** Current main-slider configuration, for its banner forms. */
  hero: HeroValues;
  /** The homepage's tile rows, whose tiles are banners. */
  tileGroups: TileGroupView[];
  /** The banner sliders added from the page builder, with their banners' pictures. */
  bannerSliders: Record<string, SliderView>;
  /** Current content settings of the sections that have them (category strip, flash deals…), for their edit forms. */
  sectionSettings: PageSectionSettingsBundle;
  /** The active categories, for a product list that shows one category. */
  categoryOptions: CategoryOption[];
  /** Current top-menu links and the ready-made links the menu form offers. */
  menu: { items: HomepageMenuItem[]; linkOptions: HomepageMenuLinkOption[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Snapshot>({ layout: initialSections, display: initialDisplay });
  const [draft, setDraft] = useState<Draft>({ current: saved, past: [], future: [] });
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [editSection, setEditSection] = useState<string | null>(null);
  // The group of settings picked in the edit dialog's list (see `edit-items.ts`), once a form is open.
  const [editItem, setEditItem] = useState<string | null>(null);
  // Product lists created or saved during this visit; they win over what the server sent until the page catches up.
  const [localLists, setLocalLists] = useState<Record<string, ProductListConfig>>({});
  const [addStep, setAddStep] = useState<"type" | "layout" | "banner" | null>(null);
  // The section whose "add" button was pressed; the new one goes right below it.
  const [addAfter, setAddAfter] = useState<string | null>(null);
  // Sections added during this edit live only here until "save" (see modules/page-builder/pending-sections.ts).
  const [pending, setPending] = useState<PendingSections>({});
  const pendingLists = Object.fromEntries(Object.entries(pending).flatMap(([id, section]) => (section.kind === "list" ? [[id, section.config] as const] : [])));
  const pendingBanners = Object.fromEntries(Object.entries(pending).flatMap(([id, section]) => (section.kind === "banner" ? [[id, { layout: section.layout, items: section.items }] as const] : [])));
  const productLists = { ...sectionSettings.productLists, ...localLists, ...pendingLists };
  const { layout, display } = draft.current;

  // The pending sections that are on the draft page are drawn in it by the homepage (see PendingSectionsHost).
  const visiblePending = useMemo(() => pendingInLayout(pending, layout), [pending, layout]);
  useEffect(() => {
    setPendingSections(visiblePending);
    return () => setPendingSections({});
  }, [visiblePending]);

  const commit = (next: Snapshot) => setDraft((state) => ({ current: next, past: [...state.past, state.current], future: [] }));
  const undo = () => setDraft((state) => (state.past.length ? { current: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.current, ...state.future] } : state));
  const redo = () => setDraft((state) => (state.future.length ? { current: state.future[0], past: [...state.past, state.current], future: state.future.slice(1) } : state));

  function handleMove(id: string, direction: -1 | 1) {
    if (!isLayoutSection(layout, id)) {
      toast.warning("این بخش قابلیت جابه‌جایی ندارد");
      return;
    }
    const next = moveSection(layout, id, direction, isRendered);
    if (next) commit({ layout: next, display });
    else toast.info(direction < 0 ? "این بخش در بالاترین جایگاه صفحه است" : "این بخش در پایین‌ترین جایگاه صفحه است");
  }

  function requestRemove(id: string) {
    if (isLayoutSection(layout, id) && removeSection(layout, id)) setPendingRemoval(id);
    else toast.warning("این بخش قابل حذف نیست");
  }

  // A section added during this edit was never part of the page, so removing it just takes it out of the draft.
  function confirmRemove() {
    const next = pendingRemoval ? (pending[pendingRemoval] ? layout.filter((section) => section.id !== pendingRemoval) : removeSection(layout, pendingRemoval)) : null;
    if (next) commit({ layout: next, display });
    setPendingRemoval(null);
  }

  // Every section has display settings: the registry lists the switchable parts of the ones that have any, and a
  // layout section without an entry still gets the whole-section switch.
  const productListConfig: DynamicDisplayConfig = (id) => {
    if (productLists[id]) return productListDisplayConfig(productLists[id], industry);
    const bannerSet = pendingBanners[id] ?? sectionSettings.bannerSliders[id] ?? bannerSliders[id];
    return bannerSet ? bannerSliderDisplayConfig(bannerSet) : null;
  };

  function displayConfig(id: string): SectionDisplayConfig | null {
    return sectionDisplayConfig(id, industry, productListConfig) ?? (isLayoutSection(layout, id) ? { parts: [], master: "layout" } : null);
  }

  function requestSettings(id: string) {
    if (displayConfig(id)) setSettingsSection(id);
    else toast.info("تنظیمات نمایش این بخش هنوز اضافه نشده است");
  }

  function requestEdit(id: string) {
    if (isBannerSectionId(id) || isSectionSettingsId(id) || productLists[id] || sectionEditItems(id)) setEditSection(id);
    else toast.info("ویرایش این بخش هنوز اضافه نشده است");
  }

  function finishEdit() {
    setEditItem(null);
    setEditSection(null);
    router.refresh();
  }

  // A list was saved: remember it, and drop the switches its new layout doesn't have (the server did the same). A list
  // that only exists in the draft is just updated there.
  function listSaved(id: string, config: ProductListConfig) {
    if (pending[id]) setPending((current) => ({ ...current, [id]: { kind: "list", config } }));
    else setLocalLists((current) => ({ ...current, [id]: config }));
    const prune = (snapshot: Snapshot): Snapshot => ({ ...snapshot, display: pruneDisplayForList(snapshot.display, id, config, industry) });
    setSaved(prune);
    setDraft((state) => ({ current: prune(state.current), past: state.past.map(prune), future: state.future.map(prune) }));
    if (pending[id]) setEditSection(null);
    else finishEdit();
  }

  // Sections a "save" created on the server but could not put into the layout (it failed half-way) stay hidden drafts
  // there; they are thrown away when the page is opened again.
  async function discardDrafts(ids: string[]) {
    if (!ids.length) return;
    try {
      await fetch("/api/admin/settings/page-drafts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    } catch {
      // nothing to do: see above
    }
  }

  // Drafts left by an earlier visit's failed save; nothing of this visit is in them.
  useEffect(() => {
    if (!sectionSettings.draftSectionIds.length) return;
    void discardDrafts(sectionSettings.draftSectionIds).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Where a section added from `sectionId`'s toolbar goes: right below it in the draft. The header and the promo banner
  // sit above the whole layout, so below them is the top of it; the footer is below everything, so the end is right above it.
  function positionBelow(sectionId: string | null): "start" | "end" | { after: string } {
    if (sectionId === "HEADER" || sectionId === "PROMO_BANNER") return "start";
    return sectionId && isLayoutSection(layout, sectionId) ? { after: sectionId } : "end";
  }

  // A new section joins the page's draft — one undoable step, kept in the browser and saved with everything else.
  function addSectionToDraft(id: string, section: PendingSection) {
    const position = positionBelow(addAfter);
    setPending((current) => ({ ...current, [id]: section }));
    setDraft((state) => ({ current: { ...state.current, layout: insertSection(state.current.layout, { id, enabled: true }, position) }, past: [...state.past, state.current], future: [] }));
  }

  // Adding is instant: the new section joins the draft (nothing is sent to the server) and its form opens.
  function createList(layoutChoice: ProductListLayout) {
    const id = newProductListId(crypto.randomUUID());
    addSectionToDraft(id, { kind: "list", config: newProductListConfig(layoutChoice) });
    setAddStep(null);
    setEditSection(id);
  }

  function createBanner(layoutChoice: BannerLayout) {
    const id = newBannerSliderId(crypto.randomUUID());
    const items = isTileLayout(layoutChoice) ? resizeBannerItems([], bannerTileCount[layoutChoice], () => crypto.randomUUID()) : [];
    addSectionToDraft(id, { kind: "banner", layout: layoutChoice, items });
    setAddStep(null);
    setEditSection(id);
  }

  // The rows of the edit dialog's list for the sections that have a fixed set of things to edit.
  const editRows: EditItem[] = editSection ? sectionEditItems(editSection) ?? [] : [];

  // The dialog's whole-section switch is `enabled` in the homepage layout for layout sections (the slider…) and in
  // the display settings for the rest (the header…); the part switches are always display settings.
  function settingsValue(id: string): SectionDisplay {
    const stored = sectionDisplay(display, id);
    if (displayConfig(id)?.master !== "layout") return stored;
    return { enabled: layout.find((section) => section.id === id)?.enabled ?? true, hiddenParts: stored.hiddenParts };
  }

  function confirmSettings(id: string, next: SectionDisplay) {
    const inLayout = displayConfig(id)?.master === "layout";
    const nextDisplay = setSectionDisplay(display, id, inLayout ? { enabled: true, hiddenParts: next.hiddenParts } : next);
    const nextLayout = inLayout ? layout.map((section) => (section.id === id && !section.removed ? { ...section, enabled: next.enabled } : section)) : layout;
    if (!sameDisplay(nextDisplay, display) || !sameLayout(nextLayout, layout)) commit({ layout: nextLayout, display: nextDisplay });
    setSettingsSection(null);
  }

  // Cancelling puts the page back as it was — the sections added during this edit only ever lived here, so they just go.
  function cancel() {
    setPending({});
    setDraft({ current: saved, past: [], future: [] });
    setEditing(false);
    setOpen(false);
  }

  async function save() {
    setSaving(true);
    let persisted = saved;
    try {
      // Two stores, two requests: whatever already went through is remembered, so a retry only resends the rest.
      if (!sameLayout(layout, persisted.layout)) {
        // The sections added in this edit are created just before the layout that holds them.
        for (const section of layout) {
          const added = pending[section.id];
          if (added) await createPendingSection(section.id, added);
        }
        await patchJson("/api/admin/settings/homepage/layout", { sections: layout }, "ذخیره چینش صفحه انجام نشد.");
        persisted = { ...persisted, layout };
      }
      if (!sameDisplay(display, persisted.display)) {
        await patchJson("/api/admin/settings/page-display", { display }, "ذخیره تنظیمات نمایش انجام نشد.");
        persisted = { ...persisted, display };
      }
      setPending({});
      setSaved(persisted);
      setDraft({ current: persisted, past: [], future: [] });
      setEditing(false);
      setOpen(false);
      toast.success("تغییرات صفحه ذخیره شد");
      router.refresh();
    } catch (reason) {
      setSaved(persisted);
      // The layout went through, so the added sections are part of the page now; the server's copies replace the draft's.
      if (persisted.layout !== saved.layout) {
        setPending({});
        router.refresh();
      }
      toast.danger("ذخیره تغییرات صفحه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const css = layoutCss(layout, { editing }) + displayCss(display, { editing });

  return (
    <>
      <style>{css}</style>
      <PageBuilderOverlay active={editing} layoutKey={css} onMove={handleMove} onRemove={requestRemove} onOpenSettings={requestSettings} onEdit={requestEdit} onAdd={(sectionId) => { setAddAfter(sectionId); setAddStep("type"); }} />
      <PageBuilderBar
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onStartEditing={() => setEditing(true)}
        onSave={save}
        onCancel={cancel}
        onUndo={undo}
        onRedo={redo}
        canSave={!sameLayout(layout, saved.layout) || !sameDisplay(display, saved.display)}
        canUndo={draft.past.length > 0}
        canRedo={draft.future.length > 0}
        saving={saving}
      />
      {editSection && !isSectionSettingsId(editSection) && !productLists[editSection] && !isBannerSectionId(editSection) && !editItem && (
        <SectionEditDialog
          key={editSection}
          title={`ویرایش ${builderSectionLabel(editSection)}`}
          items={editRows}
          onSelect={(item) => setEditItem(item.id)}
          onClose={() => setEditSection(null)}
        />
      )}
      <PageBuilderBanners
        hero={hero}
        tileGroups={tileGroups}
        sliders={bannerSliders}
        pending={pendingBanners}
        sections={saved.layout}
        editSectionId={editSection && isBannerSectionId(editSection) ? editSection : null}
        adding={addStep === "banner"}
        onEditClose={() => setEditSection(null)}
        onAddBack={() => setAddStep("type")}
        onAddClose={() => setAddStep(null)}
        onCreate={createBanner}
        onPendingChange={(id, view) => setPending((current) => ({ ...current, [id]: { kind: "banner", layout: view.layout, items: view.items } }))}
        onChanged={() => router.refresh()}
      />
      {editSection && productLists[editSection] && <ProductListDialog key={editSection} listId={editSection} initial={productLists[editSection]} categoryOptions={categoryOptions} local={Boolean(pending[editSection])} onSaved={(config) => listSaved(editSection, config)} onClose={() => setEditSection(null)} />}
      {addStep === "type" && <SectionEditDialog title="افزودن بخش" items={[{ id: "product-list", title: "لیست محصولات", description: "نمایش محصولات با ظاهرهای گوناگون", icon: "list" }, { id: "banner", title: "بنر", description: "اسلایدر یا ردیف‌های تصویری با ظاهرهای گوناگون", icon: "image" }]} onSelect={(item) => setAddStep(item.id === "banner" ? "banner" : "layout")} onClose={() => setAddStep(null)} />}
      {addStep === "layout" && <ProductListLayoutPicker saving={false} onConfirm={createList} onBack={() => setAddStep("type")} onClose={() => setAddStep(null)} />}
      {editSection && isSectionSettingsId(editSection) && <SectionContentDialog key={editSection} sectionId={editSection} sectionLabel={builderSectionLabel(editSection)} initial={sectionSettings[editSection]} onSaved={finishEdit} onClose={() => setEditSection(null)} />}
      {/* These forms save on their own (the data lives in other settings, not in the page draft), then the page is refreshed. */}
      {editSection === "HEADER" && editItem === "identity" && <PageBuilderIdentityDialog initial={identity} onSaved={finishEdit} onClose={() => setEditItem(null)} />}
      {editSection === "HEADER" && editItem === "menu" && <PageBuilderMenuDialog initialItems={menu.items} linkOptions={menu.linkOptions} onSaved={finishEdit} onClose={() => setEditItem(null)} />}
      {settingsSection && (
        <SectionDisplayDialog
          key={settingsSection}
          sectionLabel={builderSectionLabel(settingsSection)}
          parts={displayConfig(settingsSection)?.parts ?? []}
          masterLabel={displayConfig(settingsSection)?.masterLabel}
          value={settingsValue(settingsSection)}
          onConfirm={(next) => confirmSettings(settingsSection, next)}
          onClose={() => setSettingsSection(null)}
        />
      )}
      {pendingRemoval && (
        <PageBuilderConfirmDialog title={`حذف بخش «${builderSectionLabel(pendingRemoval)}»`} confirmLabel="حذف بخش" onConfirm={confirmRemove} onClose={() => setPendingRemoval(null)}>
          این بخش از صفحه حذف می‌شود و پس از ذخیره‌ی تغییرات، <b className="text-[var(--foreground)]">امکان بازگرداندن آن وجود ندارد.</b> آیا از حذف آن مطمئن هستید؟
        </PageBuilderConfirmDialog>
      )}
    </>
  );
}
