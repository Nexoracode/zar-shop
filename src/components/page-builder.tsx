"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { PageBuilderOverlay } from "@/components/page-builder-overlay";
import { isLayoutSection, layoutCss, moveSection, removeSection, sameLayout, sectionSelector, type LayoutSection } from "@/modules/page-builder/layout-draft";

type Draft = { layout: LayoutSection[]; past: LayoutSection[][]; future: LayoutSection[][] };

const isRendered = (id: string) => document.querySelector(sectionSelector(id)) !== null;

/**
 * Storefront page builder: the bottom dock plus the section-selection layer. The dock only opens a menu;
 * the page goes into edit mode (and the overlay turns on) once "edit page appearance" is pressed.
 *
 * Edits (remove, move up/down) are a draft over the homepage layout: they show on the page at once through
 * an injected stylesheet, can be undone and redone, and only reach the store on "save".
 */
export function PageBuilder({ initialSections }: { initialSections: LayoutSection[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialSections);
  const [draft, setDraft] = useState<Draft>({ layout: initialSections, past: [], future: [] });

  const commit = (layout: LayoutSection[]) => setDraft((current) => ({ layout, past: [...current.past, current.layout], future: [] }));
  const undo = () => setDraft((current) => (current.past.length ? { layout: current.past[current.past.length - 1], past: current.past.slice(0, -1), future: [current.layout, ...current.future] } : current));
  const redo = () => setDraft((current) => (current.future.length ? { layout: current.future[0], past: [...current.past, current.layout], future: current.future.slice(1) } : current));

  function handleMove(id: string, direction: -1 | 1) {
    if (!isLayoutSection(draft.layout, id)) {
      toast.warning("این بخش قابلیت جابه‌جایی ندارد");
      return;
    }
    const next = moveSection(draft.layout, id, direction, isRendered);
    if (next) commit(next);
    else toast.info(direction < 0 ? "این بخش در بالاترین جایگاه صفحه است" : "این بخش در پایین‌ترین جایگاه صفحه است");
  }

  function handleRemove(id: string) {
    const next = isLayoutSection(draft.layout, id) ? removeSection(draft.layout, id) : null;
    if (next) commit(next);
    else toast.warning("این بخش قابل حذف نیست");
    return Boolean(next);
  }

  function cancel() {
    setDraft({ layout: saved, past: [], future: [] });
    setEditing(false);
    setOpen(false);
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage/layout", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections: draft.layout }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره چینش صفحه انجام نشد.");
      setSaved(draft.layout);
      setDraft({ layout: draft.layout, past: [], future: [] });
      setEditing(false);
      setOpen(false);
      toast.success("چینش صفحه ذخیره شد");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره چینش صفحه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const css = layoutCss(draft.layout);

  return (
    <>
      <style>{css}</style>
      <PageBuilderOverlay active={editing} layoutKey={css} onMove={handleMove} onRemove={handleRemove} />
      <PageBuilderBar
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onStartEditing={() => setEditing(true)}
        onSave={save}
        onCancel={cancel}
        onUndo={undo}
        onRedo={redo}
        canSave={!sameLayout(draft.layout, saved)}
        canUndo={draft.past.length > 0}
        canRedo={draft.future.length > 0}
        saving={saving}
      />
    </>
  );
}
