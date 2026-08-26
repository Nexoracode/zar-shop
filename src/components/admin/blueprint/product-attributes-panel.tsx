"use client";

import { useState, type DragEvent } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { attributeFieldLimits, type CategoryAttributeGroup, type ProductAttributeValue } from "@/modules/products/attributes";
import { BpButton } from "./ui/button";
import { BpDialog } from "./ui/dialog";
import { BpInput } from "./ui/input";
import { BpTabs } from "./ui/tabs";

/**
 * Attribute groups, their definitions and this product's values — all edited in place, so
 * filling a product in no longer means a round trip to two other pages.
 *
 * The groups and the attribute names belong to the **category**, which is where this project
 * keeps them; only the values are the product's own. Renaming or removing an attribute here
 * therefore reaches every product in the same category, which is what the note in the panel
 * warns about.
 */
type Props = {
  categoryName: string;
  groups: CategoryAttributeGroup[];
  values: ProductAttributeValue[];
  onGroupsChange: (groups: CategoryAttributeGroup[]) => void;
  onValuesChange: (values: ProductAttributeValue[]) => void;
};

/** Matches `stableIdSchema`: at least 8 characters of `[a-zA-Z0-9_-]`. */
function newId() {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/** The schema stores a list per attribute; the box holds one line, so a comma separates them. */
function joinValues(values: string[]) {
  return values.join("، ");
}

function splitValues(value: string) {
  return [...new Set(value.split(/[,،]/).map((item) => item.trim()).filter(Boolean))].slice(0, 20);
}

function move<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function BlueprintProductAttributes({ categoryName, groups, values, onGroupsChange, onValuesChange }: Props) {
  const [newGroupName, setNewGroupName] = useState("");
  const [groupError, setGroupError] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingGroups, setEditingGroups] = useState<CategoryAttributeGroup[] | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null;
  const valuesById = new Map(values.map((item) => [item.attributeId, item.values]));

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) return setGroupError("نام گروه را وارد کنید.");
    if (groups.some((group) => group.name === name)) return setGroupError("گروهی با این نام از قبل هست.");
    const group = { id: newId(), name, attributes: [] };
    onGroupsChange([...groups, group]);
    setActiveGroupId(group.id);
    setNewGroupName("");
    setGroupError("");
  }

  function updateActiveGroup(next: CategoryAttributeGroup) {
    onGroupsChange(groups.map((group) => (group.id === next.id ? next : group)));
  }

  function addAttribute() {
    if (!activeGroup) return;
    updateActiveGroup({ ...activeGroup, attributes: [...activeGroup.attributes, { id: newId(), name: "", important: false, filterable: true }] });
  }

  function renameAttribute(attributeId: string, name: string) {
    if (!activeGroup) return;
    updateActiveGroup({ ...activeGroup, attributes: activeGroup.attributes.map((attribute) => (attribute.id === attributeId ? { ...attribute, name } : attribute)) });
  }

  function removeAttribute(attributeId: string) {
    if (!activeGroup) return;
    updateActiveGroup({ ...activeGroup, attributes: activeGroup.attributes.filter((attribute) => attribute.id !== attributeId) });
    onValuesChange(values.filter((item) => item.attributeId !== attributeId));
  }

  function setValue(attributeId: string, raw: string) {
    const next = splitValues(raw);
    onValuesChange([...values.filter((item) => item.attributeId !== attributeId), ...(next.length ? [{ attributeId, values: next }] : [])]);
  }

  function reorderAttribute(overId: string, after: boolean) {
    if (!activeGroup || !draggedId || draggedId === overId) return;
    const from = activeGroup.attributes.findIndex((attribute) => attribute.id === draggedId);
    const over = activeGroup.attributes.findIndex((attribute) => attribute.id === overId);
    if (from < 0 || over < 0) return;
    updateActiveGroup({ ...activeGroup, attributes: move(activeGroup.attributes, from, after ? over : Math.max(0, over)) });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <BpInput
          label="نام گروه"
          value={newGroupName}
          maxLength={attributeFieldLimits.groupName}
          error={groupError || undefined}
          placeholder="مثلاً مشخصات فنی"
          wrapperClassName="w-[min(100%,220px)]"
          onChange={(event) => { setNewGroupName(event.target.value); setGroupError(""); }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addGroup(); } }}
        />
        <BpButton variant="primary" className="field-action gap-1.5" onClick={addGroup}><Plus size={15} />افزودن یک گروه</BpButton>
        {groups.length > 0 && (
          <>
            <span className="bp-muted field-action self-center text-[12px]">یا</span>
            <BpButton className="field-action" onClick={() => setEditingGroups(groups.map((group) => ({ ...group })))}>ویرایش گروه‌ها</BpButton>
          </>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">
          هنوز گروهی برای دسته «{categoryName}» تعریف نشده است. اولین گروه را از بالا اضافه کنید.
        </p>
      ) : (
        <>
          <BpTabs label="گروه‌های مشخصات">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={activeGroup?.id === group.id}
                className="bp-tab"
                onClick={() => setActiveGroupId(group.id)}
              >
                {group.name || "بدون نام"}
                <span className="bp-muted text-[11px]">({group.attributes.length.toLocaleString("fa-IR")})</span>
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
                draggable
                onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; setDraggedId(attribute.id); }}
                onDragOver={(event) => { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); reorderAttribute(attribute.id, event.clientY > bounds.top + bounds.height / 2); }}
                onDrop={(event) => { event.preventDefault(); setDraggedId(null); }}
                onDragEnd={() => setDraggedId(null)}
                className={`flex flex-wrap items-end gap-2 border p-3 transition ${draggedId === attribute.id ? "border-[var(--bp-accent)] opacity-60" : "border-[var(--bp-divider)]"}`}
              >
                <span className="field-action cursor-grab text-[var(--bp-muted)] active:cursor-grabbing" aria-hidden="true"><GripVertical size={16} /></span>
                <BpInput
                  label="ویژگی"
                  value={attribute.name}
                  maxLength={attributeFieldLimits.attributeName}
                  placeholder="مثلاً ابعاد"
                  wrapperClassName="w-[min(100%,180px)]"
                  onChange={(event) => renameAttribute(attribute.id, event.target.value)}
                />
                <BpInput
                  label="مقدار"
                  defaultValue={joinValues(valuesById.get(attribute.id) ?? [])}
                  maxLength={attributeFieldLimits.value}
                  placeholder="چند مقدار را با «،» جدا کنید"
                  wrapperClassName="min-w-0 flex-1 sm:max-w-[320px]"
                  onChange={(event) => setValue(attribute.id, event.target.value)}
                />
                <BpButton isIconOnly variant="ghost" aria-label={`حذف ویژگی ${attribute.name || "بدون نام"}`} className="field-action text-[var(--bp-danger)]" onClick={() => removeAttribute(attribute.id)}>
                  <Trash2 size={15} />
                </BpButton>
              </div>
            ))}
          </div>

          <div className="flex justify-start">
            <BpButton variant="primary" className="gap-1.5" onClick={addAttribute}><Plus size={15} />افزودن یک ویژگی</BpButton>
          </div>
        </>
      )}

      <BpDialog
        open={editingGroups !== null}
        labelledBy="attribute-groups-title"
        title="ویرایش گروه‌ها"
        onClose={() => setEditingGroups(null)}
        actions={
          <>
            <BpButton variant="primary" onClick={() => { if (editingGroups) onGroupsChange(editingGroups.filter((group) => group.name.trim())); setEditingGroups(null); }}>تأیید</BpButton>
            <BpButton onClick={() => setEditingGroups(null)}>انصراف</BpButton>
          </>
        }
      >
        {editingGroups?.length === 0 && <p className="bp-muted m-0 text-center text-[12px]">گروهی باقی نمانده است.</p>}
        {editingGroups?.map((group, index) => (
          <div
            key={group.id}
            draggable
            onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; setDraggedId(group.id); }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!draggedId || draggedId === group.id) return;
              setEditingGroups(move(editingGroups, editingGroups.findIndex((item) => item.id === draggedId), index));
            }}
            onDrop={(event) => { event.preventDefault(); setDraggedId(null); }}
            onDragEnd={() => setDraggedId(null)}
            className={`flex items-end gap-2 border p-3 ${draggedId === group.id ? "border-[var(--bp-accent)] opacity-60" : "border-[var(--bp-divider)]"}`}
          >
            <span className="field-action cursor-grab text-[var(--bp-muted)] active:cursor-grabbing" aria-hidden="true"><GripVertical size={16} /></span>
            <BpInput
              label="نام گروه"
              value={group.name}
              maxLength={attributeFieldLimits.groupName}
              wrapperClassName="min-w-0 flex-1 max-w-[280px]"
              onChange={(event) => setEditingGroups(editingGroups.map((item) => (item.id === group.id ? { ...item, name: event.target.value } : item)))}
            />
            <BpButton isIconOnly variant="ghost" aria-label={`حذف گروه ${group.name || "بدون نام"}`} className="field-action text-[var(--bp-danger)]" onClick={() => setEditingGroups(editingGroups.filter((item) => item.id !== group.id))}>
              <Trash2 size={15} />
            </BpButton>
          </div>
        ))}
      </BpDialog>
    </div>
  );
}
