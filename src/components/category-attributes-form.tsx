"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Card, Input, Spinner, toast } from "@heroui/react";
import { Boxes, GripVertical, ListPlus, Plus, Save, Trash2 } from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { categoryAttributeSchema, type CategoryAttributeGroup } from "@/modules/products/attributes";

function stableId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function CategoryAttributesForm({ categoryId, initialGroups }: { categoryId: string; initialGroups: CategoryAttributeGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [saving, setSaving] = useState(false);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

  function addGroup() {
    setGroups((current) => [...current, { id: stableId("group"), name: "", attributes: [{ id: stableId("attribute"), name: "", allowsMultiple: false }] }]);
  }

  function updateGroup(groupId: string, update: Partial<CategoryAttributeGroup>) {
    setGroups((current) => current.map((group) => group.id === groupId ? { ...group, ...update } : group));
  }

  function addAttribute(groupId: string) {
    setGroups((current) => current.map((group) => group.id === groupId ? { ...group, attributes: [...group.attributes, { id: stableId("attribute"), name: "", allowsMultiple: false }] } : group));
  }

  function moveGroup(targetId: string) {
    if (!draggedGroupId || draggedGroupId === targetId) return;
    setGroups((current) => {
      const sourceIndex = current.findIndex((group) => group.id === draggedGroupId);
      const targetIndex = current.findIndex((group) => group.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = categoryAttributeSchema.safeParse(groups);
    if (!validation.success) {
      toast.danger("تعریف ویژگی‌ها کامل نیست", { description: validation.error.issues[0]?.message ?? "نام گروه و ویژگی‌ها را تکمیل کنید." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}/attributes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره ویژگی‌های دسته‌بندی انجام نشد.");
      setGroups(result.groups);
      toast.success("ویژگی‌های دسته‌بندی ذخیره شدند", { description: "فرم محصولات این دسته‌بندی براساس ساختار جدید به‌روزرسانی شد." });
    } catch (reason) {
      toast.danger("ذخیره ویژگی‌ها انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <Alert status="accent" className="border border-violet-200 bg-violet-50 text-violet-950"><Alert.Description className="text-xs leading-6">ویژگی‌ها فقط اطلاعات توصیفی محصول هستند. موارد قابل انتخاب هنگام خرید مثل رنگ، سایز، وزن و قیمت هر انتخاب باید از بخش «تنوع محصول» مدیریت شوند.</Alert.Description></Alert>
    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Card.Content className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Boxes size={19} /></span><div><h2 className="m-0 text-base font-black text-slate-800">ساختار ویژگی‌ها</h2><p className="mt-1 text-xs text-slate-400">ابتدا گروه و سپس ویژگی‌های داخل آن را تعریف کنید.</p></div></div><Button type="button" variant="secondary" onPress={addGroup} isDisabled={groups.length >= 20} className="gap-2 text-xs font-bold"><Plus size={15} />گروه جدید</Button></div>
        <div className="grid gap-3">
          {groups.map((group, groupIndex) => <Card key={group.id} variant="secondary" onDragOver={(event) => event.preventDefault()} onDrop={() => { moveGroup(group.id); setDraggedGroupId(null); }} className={`rounded-xl border bg-slate-50/60 shadow-none ${draggedGroupId === group.id ? "border-violet-400 opacity-50" : "border-slate-200"}`}>
            <Card.Content className="p-3 sm:p-4">
              <div className="grid items-end gap-2 sm:grid-cols-[32px_minmax(0,1fr)_36px]"><span draggable onDragStart={() => setDraggedGroupId(group.id)} onDragEnd={() => setDraggedGroupId(null)} className="mb-1 grid h-10 cursor-grab place-items-center text-slate-400"><GripVertical size={17} /></span><label className={adminLabelClass}>نام گروه<Input value={group.name} onChange={(event) => updateGroup(group.id, { name: event.target.value })} placeholder="مثلاً مشخصات کلی" fullWidth variant="secondary" className={adminFieldClass} /></label><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف گروه ${(groupIndex + 1).toLocaleString("fa-IR")}`} onPress={() => setGroups((current) => current.filter((item) => item.id !== group.id))} className="mb-1"><Trash2 size={14} /></Button></div>
              <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4">
                {group.attributes.map((attribute, attributeIndex) => <div key={attribute.id} className="grid items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_36px]"><label className={adminLabelClass}>نام ویژگی<Input value={attribute.name} onChange={(event) => updateGroup(group.id, { attributes: group.attributes.map((item) => item.id === attribute.id ? { ...item, name: event.target.value } : item) })} placeholder="مثلاً رم یا مناسب برای" fullWidth variant="secondary" className={adminFieldClass} /></label><AdminCheckbox isSelected={attribute.allowsMultiple} onChange={(allowsMultiple) => updateGroup(group.id, { attributes: group.attributes.map((item) => item.id === attribute.id ? { ...item, allowsMultiple } : item) })} description="برای مواردی مثل مناسب برای: آقایان، خانم‌ها">چند مقدار قابل ثبت باشد</AdminCheckbox><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف ویژگی ${(attributeIndex + 1).toLocaleString("fa-IR")}`} onPress={() => updateGroup(group.id, { attributes: group.attributes.filter((item) => item.id !== attribute.id) })} className="mt-5"><Trash2 size={14} /></Button></div>)}
                <Button type="button" variant="ghost" onPress={() => addAttribute(group.id)} isDisabled={group.attributes.length >= 30} className="min-h-10 justify-self-start gap-2 text-xs font-bold text-violet-700"><ListPlus size={15} />افزودن ویژگی</Button>
              </div>
            </Card.Content>
          </Card>)}
          {!groups.length && <div className="grid min-h-52 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center"><div><Boxes className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-700">هنوز گروه ویژگی تعریف نشده است</strong><p className="mt-1 text-xs text-slate-400">مثلاً گروه «مشخصات کلی» را ایجاد و ویژگی‌هایی مثل رم را به آن اضافه کنید.</p><Button type="button" variant="secondary" onPress={addGroup} className="mt-4 gap-2 text-xs font-bold"><Plus size={15} />ساخت اولین گروه</Button></div></div>}
        </div>
      </Card.Content>
    </Card>
    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm text-slate-800">ذخیره ساختار ویژگی‌ها</strong><p className="mt-1 text-xs text-slate-400">ویژگی‌های استفاده‌شده در محصولات بدون حذف مقدار آن‌ها قابل حذف نیستند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 shrink-0 gap-2 px-5 font-bold">{({ isPending }) => <>{isPending ? <Spinner size="sm" color="current" /> : <Save size={16} />}{isPending ? "در حال ذخیره..." : "ذخیره ویژگی‌ها"}</>}</Button></div></Card>
  </form>;
}
