"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Input, Spinner, toast } from "@heroui/react";
import { Boxes, ListPlus, Plus, Save, Tags, Trash2, X } from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroSelectField } from "@/components/hero-select-field";
import { categoryAttributeSchema, type CategoryAttributeGroup } from "@/modules/products/attributes";

const newItemKey = "__new__";

function stableId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function splitValues(value: string) {
  return [...new Set(value.split(/[,،]/).map((item) => item.trim()).filter(Boolean))];
}

export function CategoryAttributesForm({ categoryId, initialGroups }: { categoryId: string; initialGroups: CategoryAttributeGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroups[0]?.id ?? newItemKey);
  const [selectedAttributeId, setSelectedAttributeId] = useState(initialGroups[0]?.attributes[0]?.id ?? newItemKey);
  const [newGroupName, setNewGroupName] = useState("");
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeAllowsMultiple, setNewAttributeAllowsMultiple] = useState(false);
  const [newAttributeImportant, setNewAttributeImportant] = useState(false);
  const [valueDraft, setValueDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const selectedAttribute = selectedGroup?.attributes.find((attribute) => attribute.id === selectedAttributeId);

  function selectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    const group = groups.find((item) => item.id === groupId);
    setSelectedAttributeId(group?.attributes[0]?.id ?? newItemKey);
    setNewAttributeName("");
  }

  function addDefinitionValue() {
    const suggestedValues = splitValues(valueDraft);
    if (!suggestedValues.length) {
      toast.danger("مقدار ویژگی را وارد کنید", { description: "یک یا چند مقدار را با کاما از هم جدا کنید." });
      return;
    }

    if (selectedGroup) {
      if (selectedAttribute) {
        setGroups((current) => current.map((group) => group.id === selectedGroup.id ? {
          ...group,
          attributes: group.attributes.map((attribute) => attribute.id === selectedAttribute.id ? { ...attribute, suggestedValues: [...new Set([...attribute.suggestedValues, ...suggestedValues])] } : attribute),
        } : group));
      } else {
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
        setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, attributes: [...group.attributes, { id: attributeId, name, allowsMultiple: newAttributeAllowsMultiple, important: newAttributeImportant, suggestedValues }] } : group));
        setSelectedAttributeId(attributeId);
        setNewAttributeName("");
      }
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
      setGroups((current) => [...current, { id: groupId, name: groupName, attributes: [{ id: attributeId, name: attributeName, allowsMultiple: newAttributeAllowsMultiple, important: newAttributeImportant, suggestedValues }] }]);
      setSelectedGroupId(groupId);
      setSelectedAttributeId(attributeId);
      setNewGroupName("");
      setNewAttributeName("");
    }
    setValueDraft("");
  }

  function setAllowsMultiple(allowsMultiple: boolean) {
    if (!selectedGroup || !selectedAttribute) {
      setNewAttributeAllowsMultiple(allowsMultiple);
      return;
    }
    setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, attributes: group.attributes.map((attribute) => attribute.id === selectedAttribute.id ? { ...attribute, allowsMultiple } : attribute) } : group));
  }

  function setImportant(important: boolean) {
    if (!selectedGroup || !selectedAttribute) {
      setNewAttributeImportant(important);
      return;
    }
    setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, attributes: group.attributes.map((attribute) => attribute.id === selectedAttribute.id ? { ...attribute, important } : attribute) } : group));
  }

  function removeSuggestedValue(groupId: string, attributeId: string, value: string) {
    setGroups((current) => current.map((group) => group.id === groupId ? { ...group, attributes: group.attributes.map((attribute) => attribute.id === attributeId ? { ...attribute, suggestedValues: attribute.suggestedValues.filter((item) => item !== value) } : attribute) } : group));
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
      toast.success("ویژگی‌های دسته‌بندی ذخیره شدند", { description: "مقادیر پیشنهادی نیز در فرم محصولات همین دسته در دسترس هستند." });
    } catch (reason) {
      toast.danger("ذخیره ویژگی‌ها انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const attributeOptions = selectedGroup?.attributes ?? [];
  const allowsMultiple = selectedAttribute?.allowsMultiple ?? newAttributeAllowsMultiple;
  const important = selectedAttribute?.important ?? newAttributeImportant;

  return <form onSubmit={submit} className="admin-sticky-save-form grid gap-4">
    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white shadow-sm"><Card.Content className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><ListPlus size={19} /></span><div className="min-w-0"><h2 className="m-0 text-base font-black text-slate-800">افزودن ویژگی و مقدار</h2><p className="mt-1 text-xs text-slate-400">از موارد قبلی انتخاب کنید یا مورد جدید بسازید.</p></div><div className="mr-auto"><AdminSectionHelp title="افزودن ویژگی و مقدار" summary="در این بخش ساختار مشخصات محصولات این دسته را تعریف می‌کنید." blocks={[
        { title: "ترتیب ثبت", items: ["ابتدا یک گروه موجود مثل «مشخصات کلی» را انتخاب کنید یا گزینه ثبت گروه جدید را بزنید.", "بعد ویژگی‌های همان گروه را از فهرست انتخاب کنید یا یک ویژگی تازه بسازید.", "یک یا چند مقدار پیشنهادی وارد کنید؛ برای ورود هم‌زمان چند مقدار، آن‌ها را با کاما جدا کنید.", "دکمه «ثبت مقدار ویژگی» تغییر را به فهرست پایین اضافه می‌کند؛ برای اعمال نهایی باید در انتهای صفحه ذخیره کنید."] },
        { title: "تک‌مقداری یا چندمقداری", description: "برای ویژگی‌هایی مثل حافظه داخلی که هر محصول فقط یک مقدار دارد، گزینه چندمقداری را خاموش نگه دارید. برای مواردی مثل «مناسب برای» که یک محصول می‌تواند چند انتخاب داشته باشد، آن را فعال کنید." },
        { title: "تفاوت ویژگی و تنوع محصول", tone: "important", description: "ویژگی برای نمایش مشخصات توصیفی محصول است. رنگ، سایز، وزن، موجودی و قیمت انتخابی که روی خرید اثر می‌گذارند باید از بخش «تنوع محصول» مدیریت شوند." },
      ]} /></div></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid content-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <HeroSelectField name="attributeGroup" label="گروه ویژگی" value={selectedGroupId} includeEmptyOption={false} options={[...groups.map((group) => ({ value: group.id, label: group.name })), { value: newItemKey, label: "+ ثبت گروه جدید" }]} onValueChange={selectGroup} />
          {selectedGroupId === newItemKey && <label className={adminLabelClass}>نام گروه جدید<Input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="مثلاً مشخصات کلی" fullWidth variant="secondary" className={adminFieldClass} /></label>}
          <HeroSelectField name="attributeDefinition" label="ویژگی" value={selectedAttributeId} includeEmptyOption={false} options={[...attributeOptions.map((attribute) => ({ value: attribute.id, label: attribute.name })), { value: newItemKey, label: "+ ثبت ویژگی جدید" }]} onValueChange={setSelectedAttributeId} />
          {selectedAttributeId === newItemKey && <label className={adminLabelClass}>نام ویژگی جدید<Input value={newAttributeName} onChange={(event) => setNewAttributeName(event.target.value)} placeholder="مثلاً رم یا مناسب برای" fullWidth variant="secondary" className={adminFieldClass} /></label>}
          <AdminCheckbox isSelected={allowsMultiple} onChange={setAllowsMultiple} description="برای مواردی مثل مناسب برای: آقایان، خانم‌ها">چند مقدار برای محصول قابل انتخاب باشد</AdminCheckbox>
          <AdminCheckbox isSelected={important} onChange={setImportant} description="در خلاصه ویژگی‌های بالای صفحه جزئیات محصول نمایش داده شود">ویژگی مهم</AdminCheckbox>
        </div>
        <div className="grid content-start gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <label className={adminLabelClass}>مقدار ویژگی<Input value={valueDraft} onChange={(event) => setValueDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDefinitionValue(); } }} placeholder="مثلاً ۸، ۱۲، ۱۶ گیگابایت" fullWidth variant="secondary" className={adminFieldClass} /><span className="text-[10px] font-normal text-slate-400">برای ثبت چند مقدار، آن‌ها را با کاما جدا کنید.</span></label>
          {selectedAttribute?.suggestedValues.length ? <div className="flex flex-wrap gap-1.5">{selectedAttribute.suggestedValues.map((value) => <span key={value} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{value}</span>)}</div> : <span className="text-[11px] text-slate-400">هنوز مقداری برای این ویژگی ثبت نشده است.</span>}
          <Button type="button" variant="primary" onPress={addDefinitionValue} className="mt-auto min-h-11 gap-2 font-bold"><Plus size={15} />ثبت مقدار ویژگی</Button>
        </div>
      </div>
    </Card.Content></Card>

    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white shadow-sm"><Card.Content className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Boxes size={19} /></span><div className="min-w-0"><h2 className="m-0 text-base font-black text-slate-800">فهرست ویژگی‌های دسته</h2><p className="mt-1 text-xs text-slate-400">گروه‌ها، ویژگی‌ها و مقادیر ثبت‌شده را مرور کنید.</p></div><div className="mr-auto"><AdminSectionHelp title="فهرست ویژگی‌های دسته" summary="پیش‌نمایش کامل ساختاری است که برای فرم محصول این دسته استفاده می‌شود." blocks={[
        { title: "ساختار فهرست", description: "هر کارت خاکستری یک گروه است، ردیف‌های داخل آن ویژگی‌ها هستند و برچسب‌های بنفش مقادیر پیشنهادی هر ویژگی را نشان می‌دهند." },
        { title: "ویرایش و حذف", items: ["برای حذف فقط یک مقدار، علامت ضربدر کنار همان مقدار را بزنید.", "برای حذف یک ویژگی، آیکون سطل همان ویژگی را بزنید.", "برای حذف کل گروه و همه ویژگی‌های داخل آن، آیکون سطل سربرگ گروه را بزنید.", "حذف‌ها تا قبل از زدن دکمه ذخیره فقط در همین فرم هستند و هنوز در دیتابیس اعمال نشده‌اند."] },
        { title: "محدودیت حذف", tone: "important", description: "اگر ویژگی روی محصولی استفاده شده باشد، سیستم اجازه حذف مخرب آن را نمی‌دهد. ابتدا مقدار آن ویژگی را از محصولات مرتبط بردارید یا فقط مقادیر پیشنهادی بلااستفاده را حذف کنید." },
      ]} /></div></div>
      <div className="grid gap-3">
        {groups.map((group) => <Card key={group.id} variant="secondary" className="rounded-xl border border-slate-200 bg-slate-50/60 shadow-none"><Card.Content className="p-3 sm:p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Tags size={16} className="text-violet-600" /><strong className="text-sm text-slate-800">{group.name}</strong><span className="text-[10px] text-slate-400">{group.attributes.length.toLocaleString("fa-IR")} ویژگی</span></div><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف گروه ${group.name}`} onPress={() => removeGroup(group.id)}><Trash2 size={14} /></Button></div><div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">{group.attributes.map((attribute) => <div key={attribute.id} className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><div><strong className="block text-xs text-slate-700">{attribute.name}</strong><span className="mt-1 block text-[10px] text-slate-400">{attribute.allowsMultiple ? "چندمقداری" : "تک‌مقداری"}</span></div><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف ویژگی ${attribute.name}`} onPress={() => removeAttribute(group.id, attribute.id)}><Trash2 size={13} /></Button></div>{attribute.suggestedValues.length ? <div className="mt-3 flex flex-wrap gap-1.5">{attribute.suggestedValues.map((value) => <span key={value} className="inline-flex min-h-7 items-center gap-1 rounded-md bg-violet-50 px-2 text-[10px] font-bold text-violet-700">{value}<Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف مقدار ${value}`} onPress={() => removeSuggestedValue(group.id, attribute.id, value)} className="size-5 min-h-5 min-w-5 rounded text-violet-500"><X size={11} /></Button></span>)}</div> : <span className="mt-2 block text-[10px] text-amber-600">مقداری ثبت نشده است.</span>}</div>)}</div></Card.Content></Card>)}
        {!groups.length && <div className="grid min-h-40 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center"><div><Boxes className="mx-auto mb-2 text-slate-300" size={28} /><strong className="block text-sm text-slate-600">هنوز ویژگی‌ای ثبت نشده است</strong><span className="mt-1 block text-xs text-slate-400">از فرم بالا اولین گروه، ویژگی و مقدار را ثبت کنید.</span></div></div>}
      </div>
    </Card.Content></Card>

    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm text-slate-800">ذخیره ساختار ویژگی‌ها</strong><p className="mt-1 text-xs text-slate-400">ویژگی‌های استفاده‌شده در محصولات بدون حذف مقدار آن‌ها قابل حذف نیستند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 shrink-0 gap-2 px-5 font-bold">{({ isPending }) => <>{isPending ? <Spinner size="sm" color="current" /> : <Save size={16} />}{isPending ? "در حال ذخیره..." : "ذخیره ویژگی‌ها"}</>}</Button></div></Card>
  </form>;
}
