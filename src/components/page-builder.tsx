"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { PageBuilderConfirmDialog } from "@/components/page-builder-confirm-dialog";
import { PageBuilderHeroSlideDialog } from "@/components/page-builder-hero-dialogs";
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
import { heroSlideLabel, type HeroValues } from "@/modules/page-builder/hero-payload";
import { newProductListConfig, productListDisplayConfig, pruneDisplayForList, type ProductListConfig, type ProductListLayout } from "@/modules/page-builder/product-lists";
import { isSectionSettingsId, type PageSectionSettingsBundle } from "@/modules/page-builder/section-settings";
import { isLayoutSection, layoutCss, moveSection, removeSection, sameLayout, sectionSelector, type LayoutSection } from "@/modules/page-builder/layout-draft";
import { builderSectionLabel } from "@/modules/page-builder/sections";
import type { HomepageMenuItem, HomepageMenuLinkOption } from "@/modules/settings/homepage-settings";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

// Everything the builder can change, kept as one value so undo/redo step through layout and display edits alike.
type Snapshot = { layout: LayoutSection[]; display: PageDisplay };
type Draft = { current: Snapshot; past: Snapshot[]; future: Snapshot[] };

const isRendered = (id: string) => document.querySelector(sectionSelector(id)) !== null;

async function patchJson(url: string, body: unknown, fallbackMessage: string) {
  const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? fallbackMessage);
}

/**
 * Storefront page builder: the bottom dock plus the section-selection layer. The dock only opens a menu;
 * the page goes into edit mode (and the overlay turns on) once "edit page appearance" is pressed.
 *
 * Edits (remove, move up/down, display settings) are a draft over the store's page layout: they show on the page
 * at once through an injected stylesheet, can be undone and redone, and only reach the store on "save". Removing a
 * section asks for confirmation first, because once the change is saved there is no way back.
 */
export function PageBuilder({ initialSections, initialDisplay, industry, identity, menu, hero, sectionSettings, categoryOptions }: {
  initialSections: LayoutSection[];
  initialDisplay: PageDisplay;
  industry: PageBuilderIndustry;
  /** Current name, tagline and logo, for the header's "name, tagline and logo" form. */
  identity: IdentityValues;
  /** Current hero slider configuration, for the slider's banner forms. */
  hero: HeroValues;
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
  const [addStep, setAddStep] = useState<"type" | "layout" | null>(null);
  const [addingList, setAddingList] = useState(false);
  const productLists = { ...sectionSettings.productLists, ...localLists };
  const { layout, display } = draft.current;

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

  function confirmRemove() {
    const next = pendingRemoval ? removeSection(layout, pendingRemoval) : null;
    if (next) commit({ layout: next, display });
    setPendingRemoval(null);
  }

  // Every section has display settings: the registry lists the switchable parts of the ones that have any, and a
  // layout section without an entry still gets the whole-section switch.
  const productListConfig: DynamicDisplayConfig = (id) => (productLists[id] ? productListDisplayConfig(productLists[id], industry) : null);

  function displayConfig(id: string): SectionDisplayConfig | null {
    return sectionDisplayConfig(id, industry, productListConfig) ?? (isLayoutSection(layout, id) ? { parts: [], master: "layout" } : null);
  }

  function requestSettings(id: string) {
    if (displayConfig(id)) setSettingsSection(id);
    else toast.info("تنظیمات نمایش این بخش هنوز اضافه نشده است");
  }

  function requestEdit(id: string) {
    if (id === "HERO" || isSectionSettingsId(id) || productLists[id] || sectionEditItems(id)) setEditSection(id);
    else toast.info("ویرایش این بخش هنوز اضافه نشده است");
  }

  function finishEdit() {
    setEditItem(null);
    setEditSection(null);
    router.refresh();
  }

  // A list was saved: remember it, and drop the switches its new layout doesn't have (the server did the same).
  function listSaved(id: string, config: ProductListConfig) {
    setLocalLists((current) => ({ ...current, [id]: config }));
    const prune = (snapshot: Snapshot): Snapshot => ({ ...snapshot, display: pruneDisplayForList(snapshot.display, id, config, industry) });
    setSaved(prune);
    setDraft((state) => ({ current: prune(state.current), past: state.past.map(prune), future: state.future.map(prune) }));
    finishEdit();
  }

  // A section that now exists on the server (a new list) joins every state of the draft, at the end of the page, so
  // an unsaved draft survives and the next save still lists it.
  function appendSection(id: string) {
    const withSection = (snapshot: Snapshot): Snapshot => (snapshot.layout.some((section) => section.id === id) ? snapshot : { ...snapshot, layout: [...snapshot.layout, { id, enabled: true }] });
    setSaved(withSection);
    setDraft((state) => ({ current: withSection(state.current), past: state.past.map(withSection), future: state.future.map(withSection) }));
  }

  async function createList(layoutChoice: ProductListLayout) {
    setAddingList(true);
    try {
      const config = newProductListConfig(layoutChoice);
      const response = await fetch("/api/admin/settings/product-lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.id !== "string") throw new Error(result?.message ?? "افزودن لیست محصولات انجام نشد.");
      setLocalLists((current) => ({ ...current, [result.id]: config }));
      appendSection(result.id);
      toast.success("لیست محصولات به انتهای صفحه اضافه شد");
      setAddStep(null);
      // Its details come next: the edit form opens straight away.
      setEditSection(result.id);
      router.refresh();
    } catch (reason) {
      toast.danger("افزودن لیست محصولات انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setAddingList(false);
    }
  }

  // Saving a banner goes back to the banner list, which then shows the refreshed slider.
  function backToList() {
    setEditItem(null);
    router.refresh();
  }

  // The rows of the edit dialog's list: fixed for most sections, one per banner for the slider.
  const editRows: EditItem[] = editSection === "HERO"
    ? hero.slides.map((slide, index) => ({ id: `slide:${slide.id}`, title: heroSlideLabel(index), description: "برای ویرایش بنر کلیک کنید.", icon: "image" }))
    : editSection ? sectionEditItems(editSection) ?? [] : [];

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

  function cancel() {
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
      router.refresh();
    } catch (reason) {
      setSaved(persisted);
      toast.danger("ذخیره تغییرات صفحه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const css = layoutCss(layout, { editing }) + displayCss(display, { editing });

  return (
    <>
      <style>{css}</style>
      <PageBuilderOverlay active={editing} layoutKey={css} onMove={handleMove} onRemove={requestRemove} onOpenSettings={requestSettings} onEdit={requestEdit} onAdd={() => setAddStep("type")} />
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
      {editSection && !isSectionSettingsId(editSection) && !productLists[editSection] && !editItem && (
        <SectionEditDialog
          key={editSection}
          title={editSection === "HERO" ? "ویرایش بنر اسلایدر" : `ویرایش ${builderSectionLabel(editSection)}`}
          items={editRows}
          emptyMessage="هنوز بنری برای اسلایدر ثبت نشده است."
          footerAction={editSection === "HERO" ? { label: "افزودن بنر اسلایدر", disabled: hero.slides.length >= homepageFieldLimits.heroSlides, onPress: () => setEditItem("add") } : undefined}
          onSelect={(item) => setEditItem(item.id)}
          onClose={() => setEditSection(null)}
        />
      )}
      {editSection && productLists[editSection] && <ProductListDialog key={editSection} listId={editSection} initial={productLists[editSection]} categoryOptions={categoryOptions} onSaved={(config) => listSaved(editSection, config)} onClose={() => setEditSection(null)} />}
      {addStep === "type" && <SectionEditDialog title="افزودن بخش" items={[{ id: "product-list", title: "لیست محصولات", description: "نمایش محصولات با ظاهرهای گوناگون", icon: "list" }]} onSelect={() => setAddStep("layout")} onClose={() => setAddStep(null)} />}
      {addStep === "layout" && <ProductListLayoutPicker saving={addingList} onConfirm={(choice) => void createList(choice)} onBack={() => setAddStep("type")} onClose={() => setAddStep(null)} />}
      {editSection && isSectionSettingsId(editSection) && <SectionContentDialog key={editSection} sectionId={editSection} sectionLabel={builderSectionLabel(editSection)} initial={sectionSettings[editSection]} onSaved={finishEdit} onClose={() => setEditSection(null)} />}
      {/* These forms save on their own (the data lives in other settings, not in the page draft), then the page is refreshed. */}
      {editSection === "HEADER" && editItem === "identity" && <PageBuilderIdentityDialog initial={identity} onSaved={finishEdit} onClose={() => setEditItem(null)} />}
      {editSection === "HERO" && editItem && (editItem === "add" || editItem.startsWith("slide:")) && (
        <PageBuilderHeroSlideDialog key={editItem} hero={hero} slideId={editItem === "add" ? null : editItem.slice("slide:".length)} onSaved={backToList} onBack={() => setEditItem(null)} onClose={() => { setEditItem(null); setEditSection(null); }} />
      )}
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
