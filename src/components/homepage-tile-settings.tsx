"use client";

import Image from "next/image";
import { useState, type DragEvent, type FormEvent } from "react";
import { Alert, Button, Card, Chip, Input, toast } from "@heroui/react";
import { GripVertical, Images, LayoutGrid, Plus, Trash2, Upload } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { adminFieldClass } from "@/components/admin-ui";
import { HeroSelectField } from "@/components/hero-select-field";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { HomepageSettings, HomepageTileLayout } from "@/modules/settings/homepage-settings";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

type TileEditor = { id: string; href: string; media: MediaChoice | null };
type TileGroupEditor = { id: string; layout: HomepageTileLayout; tiles: TileEditor[] };
type PickerTarget = `tile:${string}:${string}`;

const layoutOptions = [
  { value: "TWO_COLUMNS", label: "دو تایی کنار هم" },
  { value: "THREE_COLUMNS", label: "سه تایی کنار هم" },
  { value: "FOUR_COLUMNS", label: "چهار تایی کنار هم" },
  { value: "TWO_BY_TWO", label: "چهار تایی، دو در دو" },
];

function toMediaChoice(media: HomepageSettings["heroDesktopMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر تایل", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function HomepageTileSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState(initialSettings.sections);
  const [groups, setGroups] = useState<TileGroupEditor[]>(() => initialSettings.tileGroups.map((group) => ({ ...group, tiles: group.tiles.map((tile) => ({ id: tile.id, href: tile.href, media: toMediaChoice(tile.media) })) })));
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [draggedTile, setDraggedTile] = useState<{ groupId: string; tileId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ groupId: string; tileId: string } | null>(null);

  function addGroup() {
    const id = createId("tile-group");
    setGroups((current) => [...current, { id, layout: "TWO_COLUMNS", tiles: Array.from({ length: 2 }, () => ({ id: createId("tile"), href: "/products", media: null })) }]);
    setSections((current) => [...current, { id: `TILE_GROUP:${id}`, enabled: true }]);
  }

  function moveTile(groupId: string, targetId: string) {
    if (!draggedTile || draggedTile.groupId !== groupId || draggedTile.tileId === targetId) return;
    setGroups((current) => current.map((group) => {
      if (group.id !== groupId) return group;
      const source = group.tiles.find((tile) => tile.id === draggedTile.tileId);
      if (!source) return group;
      const remaining = group.tiles.filter((tile) => tile.id !== draggedTile.tileId);
      const targetIndex = remaining.findIndex((tile) => tile.id === targetId);
      if (targetIndex < 0) return group;
      remaining.splice(targetIndex, 0, source);
      return { ...group, tiles: remaining };
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage/tiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, tileGroups: groups.map((group) => ({ id: group.id, layout: group.layout, tiles: group.tiles.map((tile) => ({ id: tile.id, href: tile.href, mediaId: tile.media?.id ?? null })) })) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات تایل‌ها انجام نشد.");
      toast.success("تنظیمات تایل‌ها ذخیره شد", { description: "ردیف‌ها، تصاویر، لینک‌ها و ترتیب تایل‌ها در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات تایل‌ها انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const pickerParts = pickerTarget?.split(":") ?? null;
  const selectedMedia = pickerParts ? groups.find((group) => group.id === pickerParts[1])?.tiles.find((tile) => tile.id === pickerParts[2])?.media ?? null : null;

  return <>
    <form onSubmit={submit} className="admin-sticky-save-form grid gap-5" dir="rtl">
      <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <Card.Header className="flex-row items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><LayoutGrid size={19} /></span><div><Card.Title className="text-base font-bold">ردیف‌های تایل</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">ساخت ردیف‌های تصویری با چیدمان و لینک مستقل</Card.Description></div></div>
          <div className="flex shrink-0 items-center gap-2"><AdminSectionHelp title="مدیریت تایل‌ها" summary="هر ردیف چیدمان مستقل دارد و جای آن میان بخش‌های صفحه اصلی از صفحه تنظیمات اصلی تعیین می‌شود." blocks={[{ title: "ساخت ردیف", items: ["یک ردیف جدید بسازید.", "چیدمان دو، سه، چهار ستونه یا دو در دو را انتخاب کنید.", "برای هر تایل تصویر و لینک مقصد ثبت کنید."] }, { title: "ترتیب", description: "تایل‌های داخل هر ردیف را با دستگیره مرتب کنید. برای جابه‌جایی کل ردیف میان اسلایدر و محصولات، به تنظیمات صفحه اصلی برگردید." }, { title: "نمایش", tone: "important", description: "تایل بدون تصویر در سایت نمایش داده نمی‌شود و لینک باید داخلی یا HTTPS باشد." }]} /><Button type="button" size="sm" variant="secondary" onPress={addGroup} isDisabled={groups.length >= 12} className="gap-1.5"><Plus size={14} />افزودن ردیف</Button></div>
        </Card.Header>
        <Card.Content className="p-5">
          {groups.length === 0 ? <Alert status="default"><Alert.Description>هنوز ردیف تایل ساخته نشده است.</Alert.Description></Alert> : <div className="grid gap-4">{groups.map((group, groupIndex) => {
            const gridClass = group.layout === "THREE_COLUMNS" ? "lg:grid-cols-3" : group.layout === "FOUR_COLUMNS" ? "lg:grid-cols-4" : "sm:grid-cols-2";
            return <Card key={group.id} variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 shadow-none sm:p-4">
              <div className="mb-4 flex flex-wrap items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-[var(--surface)] text-xs font-bold text-[var(--muted)]">{(groupIndex + 1).toLocaleString("fa-IR")}</span><HeroSelectField name={`layout-${group.id}`} ariaLabel={`چیدمان ردیف ${groupIndex + 1}`} value={group.layout} includeEmptyOption={false} options={layoutOptions} onValueChange={(value) => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, layout: value as HomepageTileLayout } : item))} className="min-w-[190px] flex-1 sm:max-w-[280px]" /><Chip size="sm" variant="soft"><Chip.Label>{group.tiles.length.toLocaleString("fa-IR")} تایل</Chip.Label></Chip><Button type="button" size="sm" variant="secondary" isDisabled={group.tiles.length >= 24} onPress={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, tiles: [...item.tiles, { id: createId("tile"), href: "/products", media: null }] } : item))} className="gap-1"><Plus size={14} />افزودن تایل</Button><Button type="button" size="sm" isIconOnly variant="danger-soft" aria-label={`حذف ردیف ${groupIndex + 1}`} onPress={() => { setGroups((current) => current.filter((item) => item.id !== group.id)); setSections((current) => current.filter((section) => section.id !== `TILE_GROUP:${group.id}`)); }}><Trash2 size={14} /></Button></div>
              {group.tiles.length === 0 ? <Alert status="warning"><Alert.Description>این ردیف خالی است؛ حداقل یک تایل اضافه کنید.</Alert.Description></Alert> : <div className={`grid gap-3 ${gridClass}`}>{group.tiles.map((tile, tileIndex) => <Card key={tile.id} variant="secondary" onDragOver={(event) => { if (!draggedTile || draggedTile.groupId !== group.id) return; event.preventDefault(); setDropTarget({ groupId: group.id, tileId: tile.id }); }} onDrop={(event) => { event.preventDefault(); moveTile(group.id, tile.id); setDraggedTile(null); setDropTarget(null); }} className={`overflow-hidden rounded-xl border bg-[var(--surface)] shadow-none transition ${draggedTile?.tileId === tile.id ? "opacity-45" : dropTarget?.tileId === tile.id ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/15" : "border-[var(--border)]"}`}>
                <div className="relative aspect-[16/9] bg-[var(--surface-secondary)]">{tile.media ? <Image src={tile.media.url} alt={tile.media.title} fill unoptimized={tile.media.mimeType === "image/gif"} sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" /> : <span className="grid h-full place-items-center text-[var(--muted)]"><Images size={24} /></span>}<span draggable onDragStart={(event: DragEvent<HTMLSpanElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", tile.id); setDraggedTile({ groupId: group.id, tileId: tile.id }); }} onDragEnd={() => { setDraggedTile(null); setDropTarget(null); }} className="absolute right-2 top-2 cursor-grab rounded-lg bg-black/60 text-white backdrop-blur"><Button type="button" size="sm" isIconOnly variant="ghost" aria-label={`جابه‌جایی تایل ${tileIndex + 1}`} className="pointer-events-none text-white"><GripVertical size={15} /></Button></span></div>
                <div className="grid gap-2 p-3"><Input value={tile.href} maxLength={homepageFieldLimits.href} onChange={(event) => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, tiles: item.tiles.map((entry) => entry.id === tile.id ? { ...entry, href: event.target.value } : entry) } : item))} dir="ltr" aria-label={`لینک تایل ${tileIndex + 1}`} placeholder="/products یا https://example.com" variant="secondary" className={adminFieldClass} /><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" onPress={() => setPickerTarget(`tile:${group.id}:${tile.id}`)} className="flex-1 gap-1"><Upload size={13} />{tile.media ? "تغییر عکس" : "انتخاب عکس"}</Button><Button type="button" size="sm" isIconOnly variant="danger-soft" aria-label={`حذف تایل ${tileIndex + 1}`} onPress={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, tiles: item.tiles.filter((entry) => entry.id !== tile.id) } : item))}><Trash2 size={13} /></Button></div></div>
              </Card>)}</div>}
            </Card>;
          })}</div>}
        </Card.Content>
      </Card>
      <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره تنظیمات تایل‌ها</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">ردیف‌ها، تصاویر، لینک‌ها و ترتیب داخلی تایل‌ها با هم ذخیره می‌شوند.</p></div><AdminSaveButton isSaving={saving} label="ذخیره تنظیمات تایل‌ها" /></div></Card>
    </form>
    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={selectedMedia ? [selectedMedia] : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (!pickerTarget) return; const [, groupId, tileId] = pickerTarget.split(":"); setGroups((current) => current.map((group) => group.id === groupId ? { ...group, tiles: group.tiles.map((tile) => tile.id === tileId ? { ...tile, media } : tile) } : group)); }} />
  </>;
}
