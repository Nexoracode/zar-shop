"use client";

import { useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { GripVertical, Info, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { attributeFieldLimits, categoryAttributeSchema, type CategoryAttributeGroup } from "@/modules/products/attributes";
import { BpButton, BpCheckbox, BpDialog, BpInput, BpTabs } from "./ui";

/** Matches `stableIdSchema`: at least 8 characters of `[a-zA-Z0-9_-]`. */
function newId() {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Page wrapper for the standalone route `/admin/categories/[id]/attributes`. */
export function BlueprintCategoryAttributesForm(props: {
  categoryId: string;
  categoryName: string;
  initialGroups: CategoryAttributeGroup[];
  usedAttributeIds: string[];
}) {
  return (
    <>
      <AdminPageHeader
        flush
        eyebrow="تنوع و ویژگی‌ها"
        title={`ویژگی‌های «${props.categoryName}»`}
        description="گروه‌ها و ویژگی‌هایی را تعریف کنید که فقط برای محصولات همین دسته‌بندی قابل تکمیل باشند."
        backHref="/admin/category-attributes"
        backLabel="بازگشت به ویژگی‌های دسته‌بندی"
      />
      <div className="mt-2">
        <CategoryAttributeSchemaEditor {...props} />
      </div>
    </>
  );
}

/** The editor body, usable both on its own route and embedded in the picker page. */
export function CategoryAttributeSchemaEditor({ categoryId, categoryName, initialGroups, usedAttributeIds }: {
  categoryId: string;
  categoryName: string;
  initialGroups: CategoryAttributeGroup[];
  usedAttributeIds: string[];
}) {
  const router = useRouter();
  const used = new Set(usedAttributeIds);
  const [groups, setGroups] = useState<CategoryAttributeGroup[]>(initialGroups);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialGroups));
  const [activeGroupId, setActiveGroupId] = useState<string | null>(initialGroups[0]?.id ?? null);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupError, setGroupError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingGroups, setEditingGroups] = useState<CategoryAttributeGroup[] | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragHandleId, setDragHandleId] = useState<string | null>(null);

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null;
  const dirty = JSON.stringify(groups) !== savedSnapshot;

  function addGroup() {
    const name = newGroupName.trim();
    if (name.length < 2) return setGroupError("نام گروه باید حداقل ۲ نویسه باشد.");
    if (groups.some((group) => group.name === name)) return setGroupError("گروهی با این نام از قبل هست.");
    const group: CategoryAttributeGroup = { id: newId(), name, attributes: [] };
    setGroups((current) => [...current, group]);
    setActiveGroupId(group.id);
    setNewGroupName("");
    setGroupError("");
    setError("");
  }

  function updateActiveGroup(next: CategoryAttributeGroup) {
    setGroups((current) => current.map((group) => (group.id === next.id ? next : group)));
    setError("");
  }

  function addAttribute() {
    if (!activeGroup) return;
    updateActiveGroup({ ...activeGroup, attributes: [...activeGroup.attributes, { id: newId(), name: "", important: false, filterable: true }] });
  }

  function patchAttribute(attributeId: string, patch: Partial<CategoryAttributeGroup["attributes"][number]>) {
    if (!activeGroup) return;
    updateActiveGroup({ ...activeGroup, attributes: activeGroup.attributes.map((attribute) => (attribute.id === attributeId ? { ...attribute, ...patch } : attribute)) });
  }

  function removeAttribute(attributeId: string) {
    if (!activeGroup) return;
    updateActiveGroup({ ...activeGroup, attributes: activeGroup.attributes.filter((attribute) => attribute.id !== attributeId) });
  }

  function reorderAttribute(overId: string, after: boolean) {
    if (!activeGroup || !draggedId || draggedId === overId) return;
    const from = activeGroup.attributes.findIndex((attribute) => attribute.id === draggedId);
    const over = activeGroup.attributes.findIndex((attribute) => attribute.id === overId);
    if (from < 0 || over < 0) return;
    let target = after ? over + 1 : over;
    if (target > from) target -= 1;
    updateActiveGroup({ ...activeGroup, attributes: move(activeGroup.attributes, from, target) });
  }

  async function save() {
    const cleaned = groups
      .map((group) => ({ ...group, attributes: group.attributes.filter((attribute) => attribute.name.trim()) }))
      .filter((group) => group.name.trim() && group.attributes.length);
    const validation = categoryAttributeSchema.safeParse(cleaned);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "گروه‌ها و ویژگی‌ها را بررسی کنید.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await requestJson<{ groups: CategoryAttributeGroup[] }>(`/api/categories/${categoryId}/attributes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره ویژگی‌های دسته‌بندی انجام نشد." });
      setGroups(result.groups);
      setSavedSnapshot(JSON.stringify(result.groups));
      if (!result.groups.some((group) => group.id === activeGroupId)) setActiveGroupId(result.groups[0]?.id ?? null);
      toast.success("ویژگی‌های دسته‌بندی ذخیره شد", { description: "مقدار هر ویژگی در فرم ویژگی‌های همان محصول ثبت می‌شود." });
      router.refresh();
    } catch (reason) {
      setError(requestErrorMessage(reason, "ذخیره ویژگی‌های دسته‌بندی انجام نشد."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="bp-frame relative grid gap-4 p-[18px]">
        <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] pb-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><SlidersHorizontal size={15} /></span>
          <div className="min-w-0">
            <strong className="block truncate text-[13px]">ویژگی‌های «{categoryName}»</strong>
            <span className="bp-muted block text-[11px]">گروه‌ها و ویژگی‌های توصیفی مخصوص محصولات این دسته</span>
          </div>
        </div>
        <p className="bp-muted m-0 flex items-start gap-1.5 text-[12px]">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          ویژگی برای نمایش مشخصات توصیفی محصول است؛ رنگ، سایز، وزن، موجودی و قیمت انتخابی که روی خرید اثر می‌گذارند از «انواع تنوع» مدیریت می‌شوند.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <BpInput
            label="نام گروه جدید"
            value={newGroupName}
            maxLength={attributeFieldLimits.groupName}
            error={groupError || undefined}
            placeholder="مثلاً مشخصات کلی"
            wrapperClassName="w-[min(100%,240px)]"
            onChange={(event) => { setNewGroupName(event.target.value); setGroupError(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addGroup(); } }}
          />
          <BpButton type="button" variant="primary" className="field-action gap-1.5" onClick={addGroup}><Plus size={15} />افزودن گروه</BpButton>
          {groups.length > 0 && <BpButton type="button" className="field-action" onClick={() => setEditingGroups(groups.map((group) => ({ ...group })))}>ویرایش گروه‌ها</BpButton>}
        </div>

        {groups.length === 0 ? (
          <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-6 text-center text-[12px]">هنوز گروهی برای این دسته تعریف نشده است. اولین گروه را از بالا اضافه کنید.</p>
        ) : (
          <>
            <BpTabs label="گروه‌های ویژگی">
              {groups.map((group) => (
                <button key={group.id} type="button" role="tab" aria-selected={activeGroup?.id === group.id} className="bp-tab" onClick={() => setActiveGroupId(group.id)}>
                  {group.name || "بدون نام"}
                  <span className="bp-muted text-[11px]"> ({group.attributes.length.toLocaleString("fa-IR")})</span>
                </button>
              ))}
            </BpTabs>

            <div className="grid gap-2">
              {activeGroup && activeGroup.attributes.length === 0 && (
                <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">این گروه هنوز ویژگی ندارد.</p>
              )}
              {activeGroup?.attributes.map((attribute) => (
                <div
                  key={attribute.id}
                  draggable={dragHandleId === attribute.id}
                  onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; setDraggedId(attribute.id); }}
                  onDragOver={(event) => { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); reorderAttribute(attribute.id, event.clientY > bounds.top + bounds.height / 2); }}
                  onDrop={(event) => { event.preventDefault(); setDraggedId(null); }}
                  onDragEnd={() => { setDraggedId(null); setDragHandleId(null); }}
                  className={`grid gap-2 border px-3 py-2.5 transition ${draggedId === attribute.id ? "border-[var(--bp-accent)] opacity-60" : "border-[var(--bp-divider)]"}`}
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <span className="flex h-9 shrink-0 cursor-grab items-center self-end text-[var(--bp-muted)] active:cursor-grabbing" aria-hidden="true" onMouseDown={() => setDragHandleId(attribute.id)} onMouseUp={() => setDragHandleId(null)}>
                      <GripVertical size={16} />
                    </span>
                    <BpInput
                      label="نام ویژگی"
                      value={attribute.name}
                      maxLength={attributeFieldLimits.attributeName}
                      reserveMessage={false}
                      placeholder="مثلاً حافظه داخلی"
                      wrapperClassName="w-[min(100%,240px)]"
                      onChange={(event) => patchAttribute(attribute.id, { name: event.target.value })}
                    />
                    <BpButton type="button" isIconOnly variant="ghost" aria-label={`حذف ویژگی ${attribute.name || "بدون نام"}`} title={used.has(attribute.id) ? "این ویژگی روی محصولی استفاده شده؛ ابتدا مقدارش را از محصولات بردارید." : "حذف ویژگی"} className="ms-auto text-[var(--bp-danger)]" onClick={() => removeAttribute(attribute.id)}>
                      <Trash2 size={15} />
                    </BpButton>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 ps-7">
                    <BpCheckbox isSelected={attribute.important} label={`ویژگی مهم برای ${attribute.name || "این ویژگی"}`} onChange={() => patchAttribute(attribute.id, { important: !attribute.important })}>
                      <span className="text-[12px]">ویژگی مهم <span className="bp-muted">(در خلاصهٔ بالای صفحهٔ محصول)</span></span>
                    </BpCheckbox>
                    <BpCheckbox isSelected={attribute.filterable} label={`قابل فیلتر بودن ${attribute.name || "این ویژگی"}`} onChange={() => patchAttribute(attribute.id, { filterable: !attribute.filterable })}>
                      <span className="text-[12px]">قابل فیلتر <span className="bp-muted">(در نوار فیلتر فروشگاه)</span></span>
                    </BpCheckbox>
                    {used.has(attribute.id) && <span className="bp-tag bp-tag-info">در محصولات استفاده شده</span>}
                  </div>
                </div>
              ))}
              <BpButton type="button" className="w-fit gap-1.5" onClick={addAttribute}><Plus size={13} />افزودن ویژگی</BpButton>
            </div>
          </>
        )}

        {error && <p className="m-0 border border-[var(--bp-danger)] bg-[color-mix(in_srgb,var(--bp-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--bp-danger)]">{error}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--bp-divider)] pt-3">
          <span className="bp-muted text-[12px]">{dirty ? "تغییرات ذخیره‌نشده دارید." : "ویژگی‌های استفاده‌شده در محصولات بدون حذف مقدارشان قابل حذف نیستند."}</span>
          <BpButton type="button" variant="primary" isPending={saving} disabled={!dirty} onClick={() => void save()}>ذخیره ویژگی‌ها</BpButton>
        </div>
      </section>

      <BpDialog
        open={editingGroups !== null}
        labelledBy="category-attribute-groups-title"
        title="ویرایش گروه‌ها"
        onClose={() => setEditingGroups(null)}
        actions={<>
          <BpButton variant="primary" onClick={() => {
            if (editingGroups) {
              const kept = editingGroups.filter((group) => group.name.trim());
              setGroups(kept);
              if (!kept.some((group) => group.id === activeGroupId)) setActiveGroupId(kept[0]?.id ?? null);
            }
            setEditingGroups(null);
          }}>تأیید</BpButton>
          <BpButton onClick={() => setEditingGroups(null)}>انصراف</BpButton>
        </>}
      >
        {editingGroups?.length === 0 && <p className="bp-muted m-0 text-center text-[12px]">گروهی باقی نمانده است.</p>}
        {editingGroups?.map((group, index) => (
          <div
            key={group.id}
            draggable={dragHandleId === group.id}
            onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; setDraggedId(group.id); }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!draggedId || draggedId === group.id) return;
              setEditingGroups(move(editingGroups, editingGroups.findIndex((item) => item.id === draggedId), index));
            }}
            onDrop={(event) => { event.preventDefault(); setDraggedId(null); }}
            onDragEnd={() => { setDraggedId(null); setDragHandleId(null); }}
            className={`flex items-end gap-2 border px-3 py-1.5 ${draggedId === group.id ? "border-[var(--bp-accent)] opacity-60" : "border-[var(--bp-divider)]"}`}
          >
            <span className="flex h-9 shrink-0 cursor-grab items-center self-end text-[var(--bp-muted)] active:cursor-grabbing" aria-hidden="true" onMouseDown={() => setDragHandleId(group.id)} onMouseUp={() => setDragHandleId(null)}>
              <GripVertical size={16} />
            </span>
            <BpInput
              label="نام گروه"
              value={group.name}
              maxLength={attributeFieldLimits.groupName}
              reserveMessage={false}
              wrapperClassName="min-w-0 flex-1"
              onChange={(event) => setEditingGroups(editingGroups.map((item) => (item.id === group.id ? { ...item, name: event.target.value } : item)))}
            />
            <BpButton type="button" isIconOnly variant="ghost" aria-label={`حذف گروه ${group.name || "بدون نام"}`} className="text-[var(--bp-danger)]" onClick={() => setEditingGroups(editingGroups.filter((item) => item.id !== group.id))}>
              <Trash2 size={15} />
            </BpButton>
          </div>
        ))}
      </BpDialog>
    </>
  );
}
