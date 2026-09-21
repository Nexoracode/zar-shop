"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { PageBuilderConfirmDialog } from "@/components/page-builder-confirm-dialog";
import { PageBuilderBanners, type SliderView } from "@/components/page-builder-banners";
import { setHeaderDraft } from "@/components/header-draft";
import { setEmptyPage, setPendingSections } from "@/components/pending-sections-store";
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
import { heroSettingsPayload, type HeroValues } from "@/modules/page-builder/hero-payload";
import { bannerSliderDisplayConfig, newBannerSliderId, pruneDisplayForBanner } from "@/modules/page-builder/banner-sliders";
import { categoryStripDisplayConfig, isCategoryStripId, newCategoryStripId, newCategoryStripSettings } from "@/modules/page-builder/category-strips";
import { bannerTileCount, isBannerSectionId, isTileLayout, type BannerLayout } from "@/modules/page-builder/banners";
import { resizeBannerItems, sliderConfigPayload, tileGroupsPayload, type TileGroupView } from "@/modules/page-builder/banner-items";
import { hostSections, identityEditKey, menuEditKey, replacedSectionsCss, type ContentEdit, type ContentEdits, type PendingSection, type PendingSections } from "@/modules/page-builder/pending-sections";
import { newProductListConfig, newProductListId, productListDisplayConfig, pruneDisplayForList, type ProductListConfig, type ProductListLayout } from "@/modules/page-builder/product-lists";
import { isSectionSettingsId, type CategoriesSectionSettings, type PageSectionSettingsBundle } from "@/modules/page-builder/section-settings";
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

// One edit of an existing section's content, sent to the store it lives in.
function saveEdit(key: string, edit: ContentEdit, hero: HeroValues) {
  switch (edit.kind) {
    case "hero": return patchJson("/api/admin/settings/homepage/hero", heroSettingsPayload(hero, edit.items), "ذخیره اسلایدر اصلی انجام نشد.");
    case "list": return patchJson("/api/admin/settings/product-lists", { id: key, config: edit.config }, "ذخیره لیست محصولات انجام نشد.");
    case "banner": return patchJson("/api/admin/settings/banner-sliders", { id: key, config: sliderConfigPayload(edit.layout, edit.items) }, "ذخیره بنر انجام نشد.");
    case "categories": return key === "CATEGORIES"
      ? patchJson("/api/admin/settings/page-sections", { sectionId: "CATEGORIES", settings: edit.settings }, "ذخیره تنظیمات دسته‌بندی‌ها انجام نشد.")
      : patchJson("/api/admin/settings/category-strips", { id: key, settings: edit.settings }, "ذخیره بخش دسته‌بندی انجام نشد.");
    case "identity": return patchJson("/api/admin/settings/storefront-identity", { storeName: edit.values.storeName, tagline: edit.values.tagline, mainLogoMediaId: edit.values.logo?.id ?? null }, "ذخیره نام، شعار و لوگو انجام نشد.");
    case "menu": return patchJson("/api/admin/settings/homepage/menu", { menuItems: edit.items.map((item) => ({ id: item.id, label: item.label, href: item.href })) }, "ذخیره منو انجام نشد.");
    default: return Promise.resolve();
  }
}

// A section added in this edit is created on the server, under the id it has had in the draft all along, just before
// the layout that contains it is saved (the server keeps it a hidden draft until then).
function createPendingSection(id: string, section: PendingSection) {
  if (section.kind === "list") return sendJson("POST", "/api/admin/settings/product-lists", { ...section.config, id }, "ثبت لیست محصولات انجام نشد.");
  if (section.kind === "strip") return sendJson("POST", "/api/admin/settings/category-strips", { ...section.settings, id }, "ثبت بخش دسته‌بندی انجام نشد.");
  return sendJson("POST", "/api/admin/settings/banner-sliders", { ...sliderConfigPayload(section.layout, section.items), id }, "ثبت بنر انجام نشد.");
}

/**
 * Storefront page builder: the bottom dock plus the section-selection layer. The dock only opens a menu;
 * the page goes into edit mode (and the overlay turns on) once "edit page appearance" is pressed.
 *
 * Edits (remove, move up/down, display settings) are a draft over the store's page layout: they show on the page
 * at once through an injected stylesheet, can be undone and redone, and only reach the store on "save". So does
 * everything else: the sections added here and every change to the content of an existing section (banners, lists,
 * the category strip, the header) are kept in the browser — the homepage draws them itself (`PendingSectionsHost`) —
 * and "cancel" just drops them. Removing a section asks for confirmation first, because once the change is saved
 * there is no way back.
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
  const [addStep, setAddStep] = useState<"type" | "layout" | "banner" | null>(null);
  // The section whose "add" button was pressed; the new one goes right below it.
  const [addAfter, setAddAfter] = useState<string | null>(null);
  // Sections added during this edit live only here until "save" (see modules/page-builder/pending-sections.ts).
  const [pending, setPending] = useState<PendingSections>({});
  // Changes to the content of existing sections, likewise kept here until "save".
  const [edits, setEdits] = useState<ContentEdits>({});
  // Set while a saved page is being re-read from the server: the draft copies stay until the fresh page arrives.
  const [refreshingFrom, setRefreshingFrom] = useState<PageSectionSettingsBundle | null>(null);
  if (refreshingFrom && refreshingFrom !== sectionSettings) {
    setRefreshingFrom(null);
    setPending({});
    setEdits({});
  }

  // What the forms and the page show: the server's values with the draft's edits on top.
  const heroEdit = edits.HERO?.kind === "hero" ? edits.HERO : null;
  const effectiveHero: HeroValues = heroEdit ? { ...hero, slides: heroEdit.items } : hero;
  const effectiveTileGroups: TileGroupView[] = tileGroups.map((group) => {
    const edit = edits[`TILE_GROUP:${group.id}`];
    return edit?.kind === "tiles" ? { id: group.id, layout: edit.layout, items: edit.items } : group;
  });
  const effectiveSliders: Record<string, SliderView> = { ...bannerSliders };
  const productLists: Record<string, ProductListConfig> = { ...sectionSettings.productLists };
  for (const [id, edit] of Object.entries(edits)) {
    if (edit.kind === "banner") effectiveSliders[id] = { layout: edit.layout, items: edit.items };
    else if (edit.kind === "list") productLists[id] = edit.config;
  }
  for (const [id, section] of Object.entries(pending)) {
    if (section.kind === "banner") effectiveSliders[id] = { layout: section.layout, items: section.items };
    else if (section.kind === "list") productLists[id] = section.config;
  }
  const categoriesEdit = edits.CATEGORIES?.kind === "categories" ? edits.CATEGORIES.settings : null;
  const identityEdit = edits[identityEditKey]?.kind === "identity" ? edits[identityEditKey].values : null;
  const menuEdit = edits[menuEditKey]?.kind === "menu" ? edits[menuEditKey].items : null;
  const { layout, display } = draft.current;

  // What the homepage has to draw itself: the added sections and the edited ones that can be shown from here.
  const hostDraft = useMemo(
    () => hostSections(pending, edits, layout, { contentMode: hero.contentMode, title: hero.title, description: hero.description, buttonLabel: hero.buttonLabel }),
    [pending, edits, layout, hero.contentMode, hero.title, hero.description, hero.buttonLabel],
  );
  useEffect(() => {
    setPendingSections(hostDraft);
    return () => setPendingSections({});
  }, [hostDraft]);

  // With nothing left on the draft page the homepage shows a card that invites adding a section.
  const pageEmpty = editing && !layout.some((section) => !section.removed && section.enabled);
  useEffect(() => {
    setEmptyPage(pageEmpty ? { onAdd: () => { setAddAfter("PAGE_CONTENT"); setAddStep("type"); } } : null);
    return () => setEmptyPage(null);
  }, [pageEmpty]);

  // The header is rendered on the server; its draft name, logo and menu are drawn over it by small client pieces.
  useEffect(() => {
    setHeaderDraft({ identity: identityEdit ? { storeName: identityEdit.storeName, logo: identityEdit.logo ? { url: identityEdit.logo.url, alt: identityEdit.logo.alt ?? identityEdit.logo.title } : null } : null, menu: menuEdit });
    return () => setHeaderDraft({ identity: null, menu: null });
  }, [identityEdit, menuEdit]);

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
    const bannerSet = effectiveSliders[id] ?? sectionSettings.bannerSliders[id];
    if (bannerSet) return bannerSliderDisplayConfig(bannerSet);
    return isCategoryStripId(id) ? categoryStripDisplayConfig(industry) : null;
  };

  function displayConfig(id: string): SectionDisplayConfig | null {
    return sectionDisplayConfig(id, industry, productListConfig) ?? (isLayoutSection(layout, id) ? { parts: [], master: "layout" } : null);
  }

  function requestSettings(id: string) {
    if (displayConfig(id)) setSettingsSection(id);
    else toast.info("تنظیمات نمایش این بخش هنوز اضافه نشده است");
  }

  function requestEdit(id: string) {
    if (isBannerSectionId(id) || isCategoryStripId(id) || isSectionSettingsId(id) || productLists[id] || sectionEditItems(id)) setEditSection(id);
    else toast.info("ویرایش این بخش هنوز اضافه نشده است");
  }

  // An edit of some content is kept in the draft (a new section's is part of the section itself).
  function setEdit(key: string, edit: ContentEdit) {
    setEdits((current) => ({ ...current, [key]: edit }));
  }

  function closeEdit(message = "تغییر ثبت شد؛ با «ذخیره» در صفحه اعمال می‌شود") {
    setEditItem(null);
    setEditSection(null);
    toast.info(message);
  }

  // The display switches a section's new look doesn't have are dropped from the draft (the server drops them from the
  // stored ones when the edit is saved).
  function pruneDraftDisplay(prune: (display: PageDisplay) => PageDisplay) {
    const apply = (snapshot: Snapshot): Snapshot => ({ ...snapshot, display: prune(snapshot.display) });
    setDraft((state) => ({ current: apply(state.current), past: state.past.map(apply), future: state.future.map(apply) }));
  }

  function listSaved(id: string, config: ProductListConfig) {
    if (pending[id]) setPending((current) => ({ ...current, [id]: { kind: "list", config } }));
    else setEdit(id, { kind: "list", config });
    pruneDraftDisplay((current) => pruneDisplayForList(current, id, config, industry));
    setEditSection(null);
  }

  // A banner set's banners or look changed. A pending set is updated where it lives; an existing one becomes an edit.
  function changeBanner(id: string, view: SliderView) {
    if (pending[id]) setPending((current) => ({ ...current, [id]: { kind: "banner", layout: view.layout, items: view.items } }));
    else if (id === "HERO") setEdit(id, { kind: "hero", items: view.items });
    else if (id.startsWith("TILE_GROUP:")) setEdit(id, { kind: "tiles", layout: view.layout, items: view.items });
    else setEdit(id, { kind: "banner", layout: view.layout, items: view.items });
    if (!id.startsWith("TILE_GROUP:") && id !== "HERO") pruneDraftDisplay((current) => pruneDisplayForBanner(current, id, view.layout));
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
    if (sectionId === "HEADER" || sectionId === "PROMO_BANNER" || sectionId === "PAGE_CONTENT") return "start";
    return sectionId && isLayoutSection(layout, sectionId) ? { after: sectionId } : "end";
  }

  // A new section joins the page's draft — one undoable step, kept in the browser and saved with everything else.
  function addSectionToDraft(id: string, section: PendingSection, hiddenParts: string[] = []) {
    const position = positionBelow(addAfter);
    setPending((current) => ({ ...current, [id]: section }));
    setDraft((state) => ({
      current: { layout: insertSection(state.current.layout, { id, enabled: true }, position), display: hiddenParts.length ? setSectionDisplay(state.current.display, id, { enabled: true, hiddenParts }) : state.current.display },
      past: [...state.past, state.current],
      future: [],
    }));
  }

  // Adding is instant: the new section joins the draft (nothing is sent to the server). Its form isn't opened — the owner
  // edits it from the toolbar when they want to.
  function createList(layoutChoice: ProductListLayout) {
    const id = newProductListId(crypto.randomUUID());
    // The card slider ends in a "view all" card, so it starts without the text link too (it can be switched on).
    addSectionToDraft(id, { kind: "list", config: newProductListConfig(layoutChoice) }, layoutChoice === "SLIDER" ? ["more"] : []);
    setAddStep(null);
  }

  function createStrip() {
    const id = newCategoryStripId(crypto.randomUUID());
    addSectionToDraft(id, { kind: "strip", settings: newCategoryStripSettings() });
    setAddStep(null);
  }

  // The settings of an added strip: the draft's if it has any, otherwise the server's.
  function stripSettings(id: string): CategoriesSectionSettings {
    const added = pending[id];
    if (added?.kind === "strip") return added.settings;
    const edit = edits[id];
    return edit?.kind === "categories" ? edit.settings : sectionSettings.categoryStrips[id] ?? newCategoryStripSettings();
  }

  function stripSaved(id: string, settings: CategoriesSectionSettings) {
    if (pending[id]) setPending((current) => ({ ...current, [id]: { kind: "strip", settings } }));
    else setEdit(id, { kind: "categories", settings });
    setEditSection(null);
  }

  function createBanner(layoutChoice: BannerLayout) {
    const id = newBannerSliderId(crypto.randomUUID());
    const items = isTileLayout(layoutChoice) ? resizeBannerItems([], bannerTileCount[layoutChoice], () => crypto.randomUUID()) : [];
    addSectionToDraft(id, { kind: "banner", layout: layoutChoice, items });
    setAddStep(null);
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

  // Cancelling puts the page back as it was — the sections added and the content edited during this visit only ever lived
  // here, so they just go.
  function cancel() {
    setPending({});
    setEdits({});
    setDraft({ current: saved, past: [], future: [] });
    setEditing(false);
    setOpen(false);
  }

  async function save() {
    setSaving(true);
    let persisted = saved;
    const done = new Set<string>();
    try {
      // What was edited in existing sections goes first, each into the store it lives in. Edits of sections that were
      // removed from the draft are dropped. The tile rows go in one request: they are stored together.
      const onPage = (key: string) => !layout.some((section) => section.id === key && section.removed);
      const toSave = Object.entries(edits).filter(([key]) => onPage(key));
      if (toSave.some(([, edit]) => edit.kind === "tiles")) {
        await patchJson("/api/admin/settings/homepage/tiles", { sections: saved.layout, tileGroups: tileGroupsPayload(effectiveTileGroups) }, "ذخیره بنرها انجام نشد.");
        toSave.filter(([, edit]) => edit.kind === "tiles").forEach(([key]) => done.add(key));
      }
      for (const [key, edit] of toSave) {
        if (done.has(key)) continue;
        await saveEdit(key, edit, hero);
        done.add(key);
      }
      // Two more stores, two more requests: whatever already went through is remembered, so a retry only resends the rest.
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
      setSaved(persisted);
      setDraft({ current: persisted, past: [], future: [] });
      setEditing(false);
      setOpen(false);
      toast.success("تغییرات صفحه ذخیره شد");
      // The draft's copies stay on the page until the fresh, saved page arrives (they are dropped when it does).
      setRefreshingFrom(sectionSettings);
      router.refresh();
    } catch (reason) {
      setSaved(persisted);
      // What already went through is on the server now: it stops being an edit here, and the page is re-read.
      if (done.size) setEdits((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !done.has(key))));
      if (persisted.layout !== saved.layout) setPending({});
      if (done.size || persisted.layout !== saved.layout) router.refresh();
      toast.danger("ذخیره تغییرات صفحه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const css = layoutCss(layout, { editing }) + displayCss(display, { editing }) + replacedSectionsCss(hostDraft);

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
        canSave={!sameLayout(layout, saved.layout) || !sameDisplay(display, saved.display) || Object.keys(edits).length > 0}
        canUndo={draft.past.length > 0}
        canRedo={draft.future.length > 0}
        saving={saving}
      />
      {editSection && !isSectionSettingsId(editSection) && !productLists[editSection] && !isBannerSectionId(editSection) && !isCategoryStripId(editSection) && !editItem && (
        <SectionEditDialog
          key={editSection}
          title={`ویرایش ${builderSectionLabel(editSection)}`}
          items={editRows}
          onSelect={(item) => setEditItem(item.id)}
          onClose={() => setEditSection(null)}
        />
      )}
      <PageBuilderBanners
        hero={effectiveHero}
        tileGroups={effectiveTileGroups}
        sliders={effectiveSliders}
        editSectionId={editSection && isBannerSectionId(editSection) ? editSection : null}
        adding={addStep === "banner"}
        onEditClose={() => setEditSection(null)}
        onAddBack={() => setAddStep("type")}
        onAddClose={() => setAddStep(null)}
        onCreate={createBanner}
        onChange={changeBanner}
      />
      {editSection && productLists[editSection] && <ProductListDialog key={editSection} listId={editSection} initial={productLists[editSection]} categoryOptions={categoryOptions} onSaved={(config) => listSaved(editSection, config)} onClose={() => setEditSection(null)} />}
      {addStep === "type" && <SectionEditDialog title="افزودن بخش" items={[{ id: "product-list", title: "لیست محصولات", description: "نمایش محصولات با ظاهرهای گوناگون", icon: "list" }, { id: "banner", title: "بنر", description: "اسلایدر یا ردیف‌های تصویری با ظاهرهای گوناگون", icon: "image" }, ...(industry === "GENERAL" ? [{ id: "categories", title: "دسته‌بندی", description: "ردیفی از دسته‌بندی‌های فروشگاه", icon: "list" as const }] : [])]} onSelect={(item) => { if (item.id === "categories") createStrip(); else setAddStep(item.id === "banner" ? "banner" : "layout"); }} onClose={() => setAddStep(null)} />}
      {addStep === "layout" && <ProductListLayoutPicker saving={false} onConfirm={createList} onBack={() => setAddStep("type")} onClose={() => setAddStep(null)} />}
      {editSection && isCategoryStripId(editSection) && <SectionContentDialog key={editSection} sectionId="CATEGORIES" sectionLabel={builderSectionLabel(editSection)} initial={stripSettings(editSection)} onSaved={(settings) => stripSaved(editSection, settings as CategoriesSectionSettings)} onClose={() => setEditSection(null)} />}
      {editSection && isSectionSettingsId(editSection) && <SectionContentDialog key={editSection} sectionId={editSection} sectionLabel={builderSectionLabel(editSection)} initial={categoriesEdit ?? sectionSettings[editSection]} onSaved={(settings) => { setEdit(editSection, { kind: "categories", settings: settings as CategoriesSectionSettings }); closeEdit(); }} onClose={() => setEditSection(null)} />}
      {/* Their values go into the draft like everything else and are saved with "save" (the header can't show them before that). */}
      {editSection === "HEADER" && editItem === "identity" && <PageBuilderIdentityDialog initial={identityEdit ?? identity} onConfirm={(values) => { setEdit(identityEditKey, { kind: "identity", values }); closeEdit(); }} onClose={() => setEditItem(null)} />}
      {editSection === "HEADER" && editItem === "menu" && <PageBuilderMenuDialog initialItems={menuEdit ?? menu.items} linkOptions={menu.linkOptions} onConfirm={(items) => { setEdit(menuEditKey, { kind: "menu", items }); closeEdit(); }} onClose={() => setEditItem(null)} />}
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
