"use client";

import Image from "next/image";
import { useState, type DragEvent, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { GripVertical, Images, Plus, Trash2 } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { HomepageSettings, HomepageTileLayout } from "@/modules/settings/homepage-settings";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpKicker, BpSelect, BpTag } from "./ui";

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

export function BlueprintHomepageTileSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
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
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><BpKicker>ردیف‌های تایل</BpKicker><p className="bp-muted m-0 mt-1 text-[12px] leading-6">ساخت ردیف‌های تصویری با چیدمان و لینک مستقل</p></div>
          <BpButton type="button" size="sm" variant="primary" onClick={addGroup} disabled={groups.length >= 12} className="shrink-0 gap-1.5"><Plus size={14} />افزودن ردیف</BpButton>
        </div>
        <div className="mt-3">
          {groups.length === 0 ? (
            <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">هنوز ردیف تایل ساخته نشده است.</p>
          ) : (
            <div className="grid gap-3">
              {groups.map((group, groupIndex) => {
                const gridClass = group.layout === "THREE_COLUMNS" ? "lg:grid-cols-3" : group.layout === "FOUR_COLUMNS" ? "lg:grid-cols-4" : "sm:grid-cols-2";
                return (
                  <div key={group.id} className="border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5 sm:p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2.5">
                      <span className="bp-muted grid size-7 shrink-0 place-items-center bg-[var(--bp-card)] text-[11px] font-bold">{(groupIndex + 1).toLocaleString("fa-IR")}</span>
                      <BpSelect aria-label={`چیدمان ردیف ${groupIndex + 1}`} value={group.layout} options={layoutOptions} onChange={(event) => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, layout: event.target.value as HomepageTileLayout } : item))} reserveMessage={false} wrapperClassName="min-w-[170px] flex-1 sm:max-w-[260px]" />
                      <BpTag>{group.tiles.length.toLocaleString("fa-IR")} تایل</BpTag>
                      <BpButton type="button" size="sm" disabled={group.tiles.length >= 24} onClick={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, tiles: [...item.tiles, { id: createId("tile"), href: "/products", media: null }] } : item))} className="gap-1"><Plus size={13} />افزودن تایل</BpButton>
                      <BpButton type="button" size="sm" isIconOnly variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ردیف ${groupIndex + 1}`} onClick={() => { setGroups((current) => current.filter((item) => item.id !== group.id)); setSections((current) => current.filter((section) => section.id !== `TILE_GROUP:${group.id}`)); }}><Trash2 size={14} /></BpButton>
                    </div>
                    {group.tiles.length === 0 ? (
                      <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-3 text-center text-[12px]">این ردیف خالی است؛ حداقل یک تایل اضافه کنید.</p>
                    ) : (
                      <div className={`grid gap-2.5 ${gridClass}`}>
                        {group.tiles.map((tile, tileIndex) => (
                          <div
                            key={tile.id}
                            onDragOver={(event) => { if (!draggedTile || draggedTile.groupId !== group.id) return; event.preventDefault(); setDropTarget({ groupId: group.id, tileId: tile.id }); }}
                            onDrop={(event) => { event.preventDefault(); moveTile(group.id, tile.id); setDraggedTile(null); setDropTarget(null); }}
                            className={`overflow-hidden border bg-[var(--bp-card)] transition ${draggedTile?.tileId === tile.id ? "opacity-45" : dropTarget?.tileId === tile.id ? "border-[var(--bp-accent)]" : "border-[var(--bp-divider)]"}`}
                          >
                            <div className="relative aspect-[16/9] bg-[var(--bp-bg)]">
                              {tile.media ? <Image src={tile.media.url} alt={tile.media.title} fill unoptimized={tile.media.mimeType === "image/gif"} sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" /> : <span className="bp-muted grid h-full place-items-center"><Images size={20} /></span>}
                              <span draggable onDragStart={(event: DragEvent<HTMLSpanElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", tile.id); setDraggedTile({ groupId: group.id, tileId: tile.id }); }} onDragEnd={() => { setDraggedTile(null); setDropTarget(null); }} className="absolute end-1.5 top-1.5 grid size-6 cursor-grab place-items-center bg-black/60 text-white"><GripVertical size={14} /></span>
                            </div>
                            <div className="grid gap-1.5 p-2">
                              <BpInput aria-label={`لینک تایل ${tileIndex + 1}`} dir="ltr" maxLength={homepageFieldLimits.href} value={tile.href} onChange={(event) => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, tiles: item.tiles.map((entry) => entry.id === tile.id ? { ...entry, href: event.target.value } : entry) } : item))} placeholder="/products یا https://example.com" reserveMessage={false} />
                              <div className="flex gap-1.5">
                                <BpButton type="button" size="sm" onClick={() => setPickerTarget(`tile:${group.id}:${tile.id}`)} className="flex-1 gap-1">{tile.media ? "تغییر عکس" : "انتخاب عکس"}</BpButton>
                                <BpButton type="button" size="sm" isIconOnly variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف تایل ${tileIndex + 1}`} onClick={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, tiles: item.tiles.filter((entry) => entry.id !== tile.id) } : item))}><Trash2 size={13} /></BpButton>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">ردیف‌ها، تصاویر، لینک‌ها و ترتیب داخلی تایل‌ها با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات تایل‌ها</BpButton>
      </section>
    </form>
    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={selectedMedia ? [selectedMedia] : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (!pickerTarget) return; const [, groupId, tileId] = pickerTarget.split(":"); setGroups((current) => current.map((group) => group.id === groupId ? { ...group, tiles: group.tiles.map((tile) => tile.id === tileId ? { ...tile, media } : tile) } : group)); }} />
  </>;
}
