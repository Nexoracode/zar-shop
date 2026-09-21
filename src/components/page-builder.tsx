"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toast } from "@heroui/react";
import { TriangleAlert, X } from "lucide-react";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { PageBuilderOverlay } from "@/components/page-builder-overlay";
import { SectionDisplayDialog } from "@/components/section-display-dialog";
import { SectionEditDialog } from "@/components/section-edit-dialog";
import { displayCss, sameDisplay, sectionDisplay, sectionDisplayParts, setSectionDisplay, type PageBuilderIndustry, type PageDisplay, type SectionDisplay } from "@/modules/page-builder/display-parts";
import { sectionEditItems } from "@/modules/page-builder/edit-items";
import { isLayoutSection, layoutCss, moveSection, removeSection, sameLayout, sectionSelector, type LayoutSection } from "@/modules/page-builder/layout-draft";
import { builderSectionLabel } from "@/modules/page-builder/sections";

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
export function PageBuilder({ initialSections, initialDisplay, industry }: { initialSections: LayoutSection[]; initialDisplay: PageDisplay; industry: PageBuilderIndustry }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Snapshot>({ layout: initialSections, display: initialDisplay });
  const [draft, setDraft] = useState<Draft>({ current: saved, past: [], future: [] });
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [editSection, setEditSection] = useState<string | null>(null);
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

  function requestSettings(id: string) {
    if (sectionDisplayParts(id, industry)) setSettingsSection(id);
    else toast.info("تنظیمات نمایش این بخش هنوز اضافه نشده است");
  }

  function requestEdit(id: string) {
    if (sectionEditItems(id)) setEditSection(id);
    else toast.info("ویرایش این بخش هنوز اضافه نشده است");
  }

  function confirmSettings(id: string, next: SectionDisplay) {
    const nextDisplay = setSectionDisplay(display, id, next);
    if (!sameDisplay(nextDisplay, display)) commit({ layout, display: nextDisplay });
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

  const css = layoutCss(layout) + displayCss(display, { editing });

  return (
    <>
      <style>{css}</style>
      <PageBuilderOverlay active={editing} layoutKey={css} onMove={handleMove} onRemove={requestRemove} onOpenSettings={requestSettings} onEdit={requestEdit} />
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
      {editSection && (
        <SectionEditDialog
          key={editSection}
          sectionLabel={builderSectionLabel(editSection)}
          items={sectionEditItems(editSection) ?? []}
          onSelect={(item) => toast.info(`ویرایش «${item.title}» هنوز اضافه نشده است`)}
          onClose={() => setEditSection(null)}
        />
      )}
      {settingsSection && (
        <SectionDisplayDialog
          key={settingsSection}
          sectionLabel={builderSectionLabel(settingsSection)}
          parts={sectionDisplayParts(settingsSection, industry) ?? []}
          value={sectionDisplay(display, settingsSection)}
          onConfirm={(next) => confirmSettings(settingsSection, next)}
          onClose={() => setSettingsSection(null)}
        />
      )}
      {/* The dialog is portaled to <body>, so `data-page-builder-ui` on it keeps it clickable while the page is in edit mode. */}
      <Modal.Backdrop isOpen={pendingRemoval !== null} onOpenChange={(next) => { if (!next) setPendingRemoval(null); }} variant="blur" className="z-[200]">
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog data-page-builder-ui aria-label="تأیید حذف بخش" dir="rtl" className="mx-4 max-w-md bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
              <Modal.Heading className="flex items-center gap-2 text-base font-bold"><TriangleAlert size={20} className="text-[var(--danger)]" />حذف بخش «{builderSectionLabel(pendingRemoval ?? undefined)}»</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="p-5 text-sm leading-7 text-[var(--muted)]">
              این بخش از صفحه حذف می‌شود و پس از ذخیره‌ی تغییرات، <b className="text-[var(--foreground)]">امکان بازگرداندن آن وجود ندارد.</b> آیا از حذف آن مطمئن هستید؟
            </Modal.Body>
            <Modal.Footer className="justify-start gap-2 border-t border-[var(--border)] p-4">
              <Button type="button" variant="danger" onPress={confirmRemove}>حذف بخش</Button>
              <Button type="button" variant="secondary" onPress={() => setPendingRemoval(null)}>انصراف</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
