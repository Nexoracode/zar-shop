"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { Button, Card, Input, toast } from "@heroui/react";
import { Boxes, GripVertical, ListOrdered, ListPlus, Minus, Plus, Tags, Trash2 } from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { AdminSaveButton } from "@/components/admin-save-button";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroSelectField } from "@/components/hero-select-field";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { AdminSelectField } from "@/components/admin/admin-form-fields";
import { categoryAttributeSchema, type CategoryAttributeGroup } from "@/modules/products/attributes";
import { attributeFieldLimits } from "@/modules/products/attributes";

const newItemKey = "__new__";
type SortMode = "groups" | "attributes";

function stableId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function CategoryAttributesForm({ categoryId, initialGroups }: { categoryId: string; initialGroups: CategoryAttributeGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroups[0]?.id ?? newItemKey);
  const [selectedAttributeId, setSelectedAttributeId] = useState(initialGroups[0]?.attributes[0]?.id ?? newItemKey);
  const [newGroupName, setNewGroupName] = useState("");
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeImportant, setNewAttributeImportant] = useState(false);
  const [newAttributeFilterable, setNewAttributeFilterable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode | null>(null);
  const [sortGroupId, setSortGroupId] = useState("");
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const selectedAttribute = selectedGroup?.attributes.find((attribute) => attribute.id === selectedAttributeId);

  function selectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    const group = groups.find((item) => item.id === groupId);
    setSelectedAttributeId(group?.attributes[0]?.id ?? newItemKey);
    setNewAttributeName("");
  }

  function addDefinition() {
    if (selectedGroup) {
      if (selectedAttribute) return;
      const name = newAttributeName.trim();
      if (name.length < 2) {
        toast.danger("نام ویژگی را وارد کنید");
        return;
      }
      if (selectedGroup.attributes.some((attribute) => attribute.name === name)) {
        toast.danger("این ویژگی قبلاً در گروه ثبت شده است", { description: "ویژگی موجود را از فهرست انتخاب کنید." });
        return;
      }
      const attributeId = stableId("attribute");
      setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, attributes: [...group.attributes, { id: attributeId, name, important: newAttributeImportant, filterable: newAttributeFilterable }] } : group));
      setSelectedAttributeId(attributeId);
      setNewAttributeName("");
    } else {
      const groupName = newGroupName.trim();
      const attributeName = newAttributeName.trim();
      if (groupName.length < 2 || attributeName.length < 2) {
        toast.danger("نام گروه و ویژگی را کامل کنید");
        return;
      }
      if (groups.some((group) => group.name === groupName)) {
        toast.danger("این گروه قبلاً ثبت شده است", { description: "گروه موجود را از فهرست انتخاب کنید." });
        return;
      }
      const groupId = stableId("group");
      const attributeId = stableId("attribute");
      setGroups((current) => [...current, { id: groupId, name: groupName, attributes: [{ id: attributeId, name: attributeName, important: newAttributeImportant, filterable: newAttributeFilterable }] }]);
      setSelectedGroupId(groupId);
      setSelectedAttributeId(attributeId);
      setNewGroupName("");
      setNewAttributeName("");
    }
  }

  function setImportant(important: boolean) {
    if (!selectedGroup || !selectedAttribute) {
      setNewAttributeImportant(important);
      return;
    }
    setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, attributes: group.attributes.map((attribute) => attribute.id === selectedAttribute.id ? { ...attribute, important } : attribute) } : group));
  }

  function setFilterable(filterable: boolean) {
    if (!selectedGroup || !selectedAttribute) {
      setNewAttributeFilterable(filterable);
      return;
    }
    setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, attributes: group.attributes.map((attribute) => attribute.id === selectedAttribute.id ? { ...attribute, filterable } : attribute) } : group));
  }

  function removeAttribute(groupId: string, attributeId: string) {
    const group = groups.find((item) => item.id === groupId);
    if (group?.attributes.length === 1) {
      removeGroup(groupId);
      return;
    }
    const remaining = group?.attributes.filter((attribute) => attribute.id !== attributeId) ?? [];
    setGroups((current) => current.map((item) => item.id === groupId ? { ...item, attributes: remaining } : item));
    if (selectedAttributeId === attributeId) setSelectedAttributeId(remaining[0]?.id ?? newItemKey);
  }

  function removeGroup(groupId: string) {
    const next = groups.filter((group) => group.id !== groupId);
    setGroups(next);
    if (selectedGroupId === groupId) {
      setSelectedGroupId(next[0]?.id ?? newItemKey);
      setSelectedAttributeId(next[0]?.attributes[0]?.id ?? newItemKey);
    }
  }

  function openSortEditor() {
    setSortMode(null);
    setSortGroupId(groups[0]?.id ?? "");
    setDraftOrder([]);
    setDraggedId(null);
    setSortOpen(true);
  }

  function chooseSortMode(mode: SortMode) {
    setSortMode(mode);
    if (mode === "groups") {
      setDraftOrder(groups.map((group) => group.id));
      return;
    }
    const groupId = sortGroupId || groups[0]?.id || "";
    setSortGroupId(groupId);
    setDraftOrder(groups.find((group) => group.id === groupId)?.attributes.map((attribute) => attribute.id) ?? []);
  }

  function selectSortGroup(groupId: string) {
    setSortGroupId(groupId);
    setDraftOrder(groups.find((group) => group.id === groupId)?.attributes.map((attribute) => attribute.id) ?? []);
  }

  function moveDraftItem(targetId: string, after: boolean) {
    if (!draggedId || draggedId === targetId) return;
    setDraftOrder((current) => {
      const sourceIndex = current.indexOf(draggedId);
      const targetIndex = current.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      let insertIndex = targetIndex + (after ? 1 : 0);
      if (sourceIndex < insertIndex) insertIndex -= 1;
      next.splice(insertIndex, 0, source);
      return next;
    });
  }

  function moveDraftItemByOffset(id: string, offset: number) {
    setDraftOrder((current) => {
      const sourceIndex = current.indexOf(id);
      const targetIndex = sourceIndex + offset;
      if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return next;
    });
  }

  function applySortOrder() {
    if (sortMode === "groups") {
      const groupById = new Map(groups.map((group) => [group.id, group]));
      setGroups(draftOrder.flatMap((id) => {
        const group = groupById.get(id);
        return group ? [group] : [];
      }));
    } else if (sortMode === "attributes" && sortGroupId) {
      setGroups((current) => current.map((group) => {
        if (group.id !== sortGroupId) return group;
        const attributeById = new Map(group.attributes.map((attribute) => [attribute.id, attribute]));
        return { ...group, attributes: draftOrder.flatMap((id) => {
          const attribute = attributeById.get(id);
          return attribute ? [attribute] : [];
        }) };
      }));
    }
    setSortOpen(false);
    setDraggedId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = categoryAttributeSchema.safeParse(groups);
    if (!validation.success) {
      toast.danger("تعریف ویژگی‌ها کامل نیست", { description: validation.error.issues[0]?.message ?? "گروه‌ها و ویژگی‌ها را بررسی کنید." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}/attributes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره ویژگی‌های دسته‌بندی انجام نشد.");
      setGroups(result.groups);
      toast.success("ویژگی‌های دسته‌بندی ذخیره شدند", { description: "مقدار هر ویژگی در صفحه ویژگی‌های همان محصول ثبت می‌شود." });
    } catch (reason) {
      toast.danger("ذخیره ویژگی‌ها انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const attributeOptions = selectedGroup?.attributes ?? [];
  const important = selectedAttribute?.important ?? newAttributeImportant;
  const filterable = selectedAttribute?.filterable ?? newAttributeFilterable;

  return <><form onSubmit={submit} className="admin-sticky-save-form grid gap-4">
    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white shadow-sm"><Card.Content className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><ListPlus size={19} /></span><div className="min-w-0"><h2 className="m-0 text-base font-bold text-slate-800">افزودن ویژگی</h2><p className="mt-1 text-xs text-slate-400">ساختار ویژگی‌های مشترک محصولات این دسته را تعریف کنید.</p></div><div className="mr-auto"><AdminSectionHelp title="افزودن ویژگی" summary="در این بخش فقط گروه و نام ویژگی‌های محصولات این دسته را تعریف می‌کنید." blocks={[
        { title: "ترتیب ثبت", items: ["ابتدا یک گروه موجود مثل «مشخصات کلی» را انتخاب کنید یا یک گروه جدید بسازید.", "سپس نام ویژگی را تعریف کنید؛ مثل «حافظه داخلی» یا «جنس بدنه».", "مقدار ویژگی در این صفحه ثبت نمی‌شود و برای هر محصول در صفحه ویژگی‌های همان محصول تعیین خواهد شد.", "برای اعمال نهایی تغییرات، در انتهای صفحه دکمه ذخیره را بزنید."] },
        { title: "تفاوت ویژگی و تنوع محصول", tone: "important", description: "ویژگی برای نمایش مشخصات توصیفی محصول است. رنگ، سایز، وزن، موجودی و قیمت انتخابی که روی خرید اثر می‌گذارند باید از بخش «تنوع محصول» مدیریت شوند." },
      ]} /></div></div>
      <div className="grid content-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <HeroSelectField name="attributeGroup" label="گروه ویژگی" value={selectedGroupId} includeEmptyOption={false} options={[...groups.map((group) => ({ value: group.id, label: group.name })), { value: newItemKey, label: "+ ثبت گروه جدید" }]} onValueChange={selectGroup} />
          {selectedGroupId === newItemKey && <label className={adminLabelClass}>نام گروه جدید<Input value={newGroupName} maxLength={attributeFieldLimits.groupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="مثلاً مشخصات کلی" fullWidth variant="secondary" className={adminFieldClass} /></label>}
          <HeroSelectField name="attributeDefinition" label="ویژگی" value={selectedAttributeId} includeEmptyOption={false} options={[...attributeOptions.map((attribute) => ({ value: attribute.id, label: attribute.name })), { value: newItemKey, label: "+ ثبت ویژگی جدید" }]} onValueChange={setSelectedAttributeId} />
          {selectedAttributeId === newItemKey && <label className={adminLabelClass}>نام ویژگی جدید<Input value={newAttributeName} maxLength={attributeFieldLimits.attributeName} onChange={(event) => setNewAttributeName(event.target.value)} placeholder="مثلاً رم یا مناسب برای" fullWidth variant="secondary" className={adminFieldClass} /></label>}
          <AdminCheckbox isSelected={important} onChange={setImportant} description="در خلاصه ویژگی‌های بالای صفحه جزئیات محصول نمایش داده شود">ویژگی مهم</AdminCheckbox>
          <AdminCheckbox isSelected={filterable} onChange={setFilterable} description="این ویژگی در نوار فیلتر فروشگاه به مشتریان نمایش داده شود">قابل فیلتر</AdminCheckbox>
          {selectedAttributeId === newItemKey && <Button type="button" variant="primary" onPress={addDefinition} className="min-h-11 gap-2 font-bold sm:justify-self-start"><Plus size={15} />ثبت ویژگی</Button>}
      </div>
    </Card.Content></Card>

    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white shadow-sm"><Card.Content className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Boxes size={19} /></span><div className="min-w-0"><h2 className="m-0 text-base font-bold text-slate-800">فهرست ویژگی‌های دسته</h2><p className="mt-1 text-xs text-slate-400">گروه‌ها و نام ویژگی‌های ثبت‌شده را مرور کنید.</p></div><div className="mr-auto flex items-center gap-2"><Button type="button" isIconOnly size="sm" variant="secondary" isDisabled={!groups.length} aria-label="مرتب‌سازی گروه‌ها و ویژگی‌ها" onPress={openSortEditor}><ListOrdered size={16} /></Button><AdminSectionHelp title="فهرست ویژگی‌های دسته" summary="پیش‌نمایش ساختاری است که برای فرم ویژگی‌های محصولات این دسته استفاده می‌شود." blocks={[
        { title: "ساختار فهرست", description: "هر کارت خاکستری یک گروه است و ردیف‌های داخل آن نام ویژگی‌هایی هستند که محصولات این دسته می‌توانند داشته باشند." },
        { title: "ویرایش و حذف", items: ["برای حذف یک ویژگی، علامت منفی کنار نام آن را بزنید.", "برای حذف کل گروه و همه ویژگی‌های داخل آن، آیکون سطل سربرگ گروه را بزنید.", "حذف‌ها تا قبل از زدن دکمه ذخیره فقط در همین فرم هستند و هنوز در دیتابیس اعمال نشده‌اند."] },
        { title: "مرتب‌سازی", description: "از آیکون ترتیب در سربرگ استفاده کنید و سپس مرتب‌سازی گروه‌ها یا ویژگی‌های یکی از گروه‌ها را انتخاب کنید." },
        { title: "محدودیت حذف", tone: "important", description: "اگر ویژگی روی محصولی استفاده شده باشد، سیستم اجازه حذف مخرب آن را نمی‌دهد. ابتدا مقدار آن ویژگی را از محصولات مرتبط بردارید." },
      ]} /></div></div>
      <div className="grid gap-3">
        {groups.map((group) => <Card key={group.id} variant="secondary" className="rounded-xl border border-slate-200 bg-slate-50/60 shadow-none"><Card.Content className="p-3 sm:p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Tags size={16} className="text-violet-600" /><strong className="text-sm text-slate-800">{group.name}</strong><span className="text-[10px] text-slate-400">{group.attributes.length.toLocaleString("fa-IR")} ویژگی</span></div><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف گروه ${group.name}`} onPress={() => removeGroup(group.id)}><Trash2 size={14} /></Button></div><div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">{group.attributes.map((attribute) => <div key={attribute.id} className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-center gap-1.5"><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف ویژگی ${attribute.name}`} onPress={() => removeAttribute(group.id, attribute.id)} className="size-6 min-h-6 min-w-6 shrink-0 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"><Minus size={13} /></Button><strong className="block min-w-0 text-xs text-slate-700">{attribute.name}</strong></div></div>)}</div></Card.Content></Card>)}
        {!groups.length && <div className="grid min-h-40 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center"><div><Boxes className="mx-auto mb-2 text-slate-300" size={28} /><strong className="block text-sm text-slate-600">هنوز ویژگی‌ای ثبت نشده است</strong><span className="mt-1 block text-xs text-slate-400">از فرم بالا اولین گروه و ویژگی را ثبت کنید.</span></div></div>}
      </div>
    </Card.Content></Card>

    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm text-slate-800">ذخیره ساختار ویژگی‌ها</strong><p className="mt-1 text-xs text-slate-400">ویژگی‌های استفاده‌شده در محصولات بدون حذف مقدار آن‌ها قابل حذف نیستند.</p></div><AdminSaveButton isSaving={saving} label="ذخیره ویژگی‌ها" /></div></Card>
  </form>

  <AdminDialog
    open={sortOpen}
    ariaLabel="مرتب‌سازی گروه‌ها و ویژگی‌ها"
    title="مرتب‌سازی ویژگی‌های دسته"
    description={sortMode ? "آیتم‌ها را بگیرید و در جایگاه دلخواه رها کنید." : "مشخص کنید کدام بخش مرتب شود."}
    size="lg"
    onClose={() => { setSortOpen(false); setDraggedId(null); }}
    actions={sortMode ? <>
      <AdminDialogButton variant="primary" onPress={applySortOrder}>اعمال ترتیب</AdminDialogButton>
      <AdminDialogButton variant="secondary" onPress={() => setSortOpen(false)}>انصراف</AdminDialogButton>
    </> : undefined}
  >
    {!sortMode ? <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => chooseSortMode("groups")} className="border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-right transition hover:border-[var(--accent)]"><strong className="block text-sm">ترتیب گروه‌ها</strong><small className="mt-2 block font-normal leading-5 text-[var(--muted)]">جای گروه‌هایی مثل مشخصات کلی و مشخصات فنی را تغییر دهید.</small></button>
      <button type="button" onClick={() => chooseSortMode("attributes")} className="border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-right transition hover:border-[var(--accent)]"><strong className="block text-sm">ترتیب ویژگی‌های یک گروه</strong><small className="mt-2 block font-normal leading-5 text-[var(--muted)]">یک گروه را انتخاب کنید و ویژگی‌های داخل آن را مرتب کنید.</small></button>
    </div> : <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {sortMode === "attributes" ? <div className="min-w-0 flex-1"><AdminSelectField name="sortAttributeGroup" label="گروه ویژگی" value={sortGroupId} options={groups.map((group) => ({ value: group.id, label: group.name }))} onValueChange={selectSortGroup} /></div> : <div><strong className="block text-sm">ترتیب گروه‌ها</strong><span className="mt-1 block text-xs text-[var(--muted)]">ترتیب نمایش گروه‌ها در مشخصات محصول</span></div>}
        <AdminDialogButton variant="secondary" onPress={() => { setSortMode(null); setDraftOrder([]); setDraggedId(null); }}>تغییر نوع مرتب‌سازی</AdminDialogButton>
      </div>
      <div className="grid gap-2">{draftOrder.map((id, index) => {
        const item = sortMode === "groups" ? groups.find((group) => group.id === id) : groups.find((group) => group.id === sortGroupId)?.attributes.find((attribute) => attribute.id === id);
        if (!item) return null;
        return <div key={id} draggable tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveDraftItemByOffset(id, -1); } else if (event.key === "ArrowDown") { event.preventDefault(); moveDraftItemByOffset(id, 1); } }} onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); setDraggedId(id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); moveDraftItem(id, event.clientY > bounds.top + bounds.height / 2); }} onDrop={(event) => { event.preventDefault(); setDraggedId(null); }} onDragEnd={() => setDraggedId(null)} className={`flex cursor-grab items-center gap-3 border p-3 outline-none transition focus:border-[var(--accent)] active:cursor-grabbing ${draggedId === id ? "border-[var(--accent)] bg-[var(--accent)]/5 opacity-60" : "border-[var(--border)] bg-[var(--surface-secondary)]"}`}>
          <GripVertical size={18} className="shrink-0 text-[var(--muted)]" />
          <span className="grid size-8 shrink-0 place-items-center bg-[var(--surface)] text-xs font-bold text-[var(--muted)]">{(index + 1).toLocaleString("fa-IR")}</span>
          <strong className="min-w-0 flex-1 truncate text-sm">{item.name}</strong>
        </div>;
      })}</div>
    </>}
  </AdminDialog>
  </>;
}
