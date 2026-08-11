"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Input, Spinner, toast } from "@heroui/react";
import { BadgePercent, Check, Eye, EyeOff, Gift, Pencil, Save, ShoppingBag, Trash2, Truck } from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { HeroDateRangeField } from "@/components/hero-date-range-field";
import { HeroNumberInput } from "@/components/hero-number-input";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";

type PromotionType = "COUPON" | "FREE_SHIPPING" | "NEXT_PURCHASE" | "FIRST_PURCHASE";
type DiscountType = "PERCENT" | "FIXED";
export type PromotionItem = {
  id: string;
  title: string;
  type: PromotionType;
  code: string | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  rewardExpiresDays: number | null;
  shippingScope: "ALL" | "TEHRAN" | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  usageCount: number;
  rewardCount: number;
};

const promotionTypes: Array<{ id: PromotionType; title: string; description: string; icon: ReactNode; color: string }> = [
  { id: "COUPON", title: "تعریف کد تخفیف", description: "کد عمومی یا اختصاصی با محدودیت مبلغ و تعداد استفاده", icon: <BadgePercent size={20} />, color: "bg-violet-50 text-violet-700" },
  { id: "FREE_SHIPPING", title: "ارسال رایگان", description: "حذف هزینه ارسال برای سفارش‌های واجد شرایط", icon: <Truck size={20} />, color: "bg-sky-50 text-sky-700" },
  { id: "NEXT_PURCHASE", title: "تخفیف خرید بعدی", description: "پاداش بازگشت مشتری پس از تکمیل سفارش", icon: <Gift size={20} />, color: "bg-amber-50 text-amber-700" },
  { id: "FIRST_PURCHASE", title: "خرید اول", description: "پیشنهاد خوش‌آمدگویی برای اولین سفارش مشتری", icon: <ShoppingBag size={20} />, color: "bg-emerald-50 text-emerald-700" },
];

const fieldLabels: Record<string, string> = {
  title: "عنوان", code: "کد تخفیف", discountValue: "مقدار تخفیف", startsAt: "شروع اعتبار", endsAt: "پایان اعتبار",
};

function typeInfo(type: PromotionType) {
  return promotionTypes.find((item) => item.id === type) ?? promotionTypes[0];
}

function optionalNumber(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? Number(normalized) : null;
}

function apiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as { message?: string; issues?: Record<string, string[] | undefined> };
  if (data.issues) {
    const first = Object.entries(data.issues).find(([, messages]) => messages?.length);
    if (first) return `${fieldLabels[first[0]] ?? first[0]}: ${first[1]?.[0]}`;
  }
  return data.message ?? fallback;
}

type AdminPromotionsProps = {
  initialItems?: PromotionItem[];
  initialEditing?: PromotionItem | null;
  mode: "list" | "form";
};

export function AdminPromotions({ initialItems = [], initialEditing = null, mode }: AdminPromotionsProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<PromotionType>(initialEditing?.type ?? "COUPON");
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(initialEditing ? { start: initialEditing.startsAt, end: initialEditing.endsAt } : null);
  const [isActive, setIsActive] = useState(initialEditing?.isActive ?? true);
  const [items, setItems] = useState<PromotionItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PromotionItem | null>(initialEditing);
  const [deleting, setDeleting] = useState<PromotionItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const selected = typeInfo(selectedType);

  function resetForm(type = selectedType) {
    setSelectedType(type);
    setEditing(null);
    setDateRange(null);
    setIsActive(true);
    setFormVersion((value) => value + 1);
  }

  function selectType(type: PromotionType) {
    if (editing) {
      setSelectedType(type);
      setFormVersion((value) => value + 1);
      return;
    }
    resetForm(type);
  }

  function editPromotion(item: PromotionItem) {
    router.push(`/admin/promotions/${item.id}/edit`);
  }

  function payloadFromForm(form: HTMLFormElement, active = isActive) {
    const data = new FormData(form);
    const discountType = selectedType === "FREE_SHIPPING" ? null : String(data.get("discountType") || "PERCENT") as DiscountType;
    return {
      title: String(data.get("title") ?? "").trim(),
      type: selectedType,
      code: selectedType === "COUPON" ? String(data.get("code") ?? "").trim().toUpperCase() : null,
      discountType,
      discountValue: selectedType === "FREE_SHIPPING" ? null : optionalNumber(data.get("discountValue")),
      minOrderAmount: optionalNumber(data.get("minOrderAmount")),
      maxDiscountAmount: selectedType === "FREE_SHIPPING" ? null : optionalNumber(data.get("maxDiscountAmount")),
      usageLimit: optionalNumber(data.get("usageLimit")),
      perUserLimit: optionalNumber(data.get("perUserLimit")) ?? 1,
      rewardExpiresDays: selectedType === "NEXT_PURCHASE" ? optionalNumber(data.get("rewardExpiresDays")) : null,
      shippingScope: selectedType === "FREE_SHIPPING" ? String(data.get("shippingScope") || "ALL") : null,
      startsAt: dateRange?.start ?? "",
      endsAt: dateRange?.end ?? "",
      isActive: active,
    };
  }

  function payloadFromItem(item: PromotionItem, active: boolean) {
    return { ...item, isActive: active, usageCount: undefined, rewardCount: undefined, id: undefined };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dateRange) {
      toast.danger("بازه اعتبار را انتخاب کنید.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/admin/promotions/${editing.id}` : "/api/admin/promotions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(event.currentTarget)),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(data, "ذخیره پروموشن انجام نشد."));
      toast.success(editing ? "پروموشن ویرایش شد." : "پروموشن ساخته شد.", { description: "قواعد کمپین از این لحظه در محاسبات سفارش بررسی می‌شوند." });
      router.push("/admin/promotions");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره پروموشن انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  async function togglePromotion(item: PromotionItem) {
    try {
      const response = await fetch(`/api/admin/promotions/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFromItem(item, !item.isActive)) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(data, "تغییر وضعیت انجام نشد."));
      setItems((current) => current.map((candidate) => candidate.id === item.id ? data : candidate));
      toast.success(item.isActive ? "پروموشن غیرفعال شد." : "پروموشن فعال شد.");
    } catch (reason) {
      toast.danger("تغییر وضعیت انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/admin/promotions/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(apiMessage(data, "حذف پروموشن انجام نشد."));
      }
      setItems((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast.success("پروموشن حذف شد.");
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : "حذف پروموشن انجام نشد.");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div dir="rtl" className="grid gap-5 text-right">
      {mode === "form" ? <>
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-black text-[var(--foreground)]">نوع پروموشن را انتخاب کنید</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">هر پروموشن قواعد و محدودیت‌های مخصوص خودش را دارد.</p></div><Chip size="sm" variant="soft" className="shrink-0 bg-violet-50 text-violet-700"><Chip.Label>۴ نوع</Chip.Label></Chip></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{promotionTypes.map((item) => { const active = selectedType === item.id; return <Button key={item.id} type="button" variant="secondary" aria-pressed={active} onPress={() => selectType(item.id)} className={`h-auto min-h-32 w-full justify-start whitespace-normal rounded-xl border p-3 text-right ${active ? "border-violet-400 bg-violet-50/60 ring-2 ring-violet-100" : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-violet-200"}`}><span className="grid w-full gap-2"><span className="flex items-start justify-between gap-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${item.color}`}>{item.icon}</span>{active ? <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-700 text-white"><Check size={13} /></span> : null}</span><strong className="block text-xs font-black text-[var(--foreground)]">{item.title}</strong><span className="block text-[11px] leading-5 text-[var(--muted)]">{item.description}</span></span></Button>; })}</div>
      </Card.Content></Card>

      <form key={`${selectedType}-${editing?.id ?? "new"}-${formVersion}`} onSubmit={submit} className="admin-sticky-save-form">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${selected.color}`}>{selected.icon}</span><div><span className="text-[10px] font-bold text-violet-600">{editing ? "ویرایش پروموشن" : "پروموشن جدید"}</span><h2 className="m-0 text-base font-black text-[var(--foreground)]">{selected.title}</h2></div></div><div className="mr-auto flex items-center gap-2"><AdminSectionHelp title={selected.title} summary="شرایط واجدبودن، محدودیت مصرف، بازه اعتبار و اثر مالی این کمپین را مشخص کنید." blocks={[{ title: "شرایط اجرا", items: ["بازه شروع و پایان را با تقویم فارسی تعیین کنید.", "حداقل مبلغ سفارش و محدودیت‌های کل یا هر مشتری را در صورت نیاز وارد کنید.", "برای تخفیف درصدی، سقف مبلغ تخفیف از هزینه غیرمنتظره جلوگیری می‌کند."] }, { title: "رفتار نوع انتخاب‌شده", description: selectedType === "COUPON" ? "مشتری باید کد را در سبد خرید وارد کند و کد فقط در صورت تطابق تمام قواعد اعمال می‌شود." : selectedType === "FREE_SHIPPING" ? "هزینه ارسال برای محدوده جغرافیایی و سفارش‌های واجد شرایط صفر می‌شود." : selectedType === "NEXT_PURCHASE" ? "پس از تکمیل خرید فعلی، پاداشی با مهلت مصرف مشخص برای خرید بعدی مشتری صادر می‌شود." : "تخفیف فقط زمانی اعمال می‌شود که مشتری هیچ سفارش موفق قبلی نداشته باشد." }, { title: "منطق مالی", tone: "important", description: "پروموشن فقط در صورت فعال‌بودن، قرارداشتن در بازه و عبور از همه محدودیت‌ها وارد محاسبات سفارش می‌شود. مقادیر اعمال‌شده در سفارش snapshot می‌شوند." }]} /><Chip size="sm" variant="soft" className={isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}><Chip.Label>{isActive ? "فعال" : "غیرفعال"}</Chip.Label></Chip></div></div>
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-2"><label className={adminLabelClass}>عنوان داخلی پروموشن<Input name="title" required defaultValue={editing?.title} fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً کمپین پایان تابستان" /></label><HeroDateRangeField label="بازه اعتبار (تقویم فارسی)" start={dateRange?.start ?? null} end={dateRange?.end ?? null} onChange={setDateRange} /></div>
            <PromotionFields type={selectedType} editing={editing} />
            <AdminCheckbox isSelected={isActive} onChange={setIsActive} icon={isActive ? <Eye size={16} /> : <EyeOff size={16} />} description="فقط پروموشن فعال و در بازه اعتبار وارد محاسبات سفارش می‌شود.">پروموشن فعال باشد</AdminCheckbox>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" isDisabled={saving} onPress={() => editing ? router.push("/admin/promotions") : resetForm(selectedType)} className="min-h-10 px-4 text-xs">{editing ? "انصراف از ویرایش" : "پاک‌کردن فرم"}</Button><Button type="submit" variant="primary" isPending={saving} className="min-h-10 gap-2 bg-violet-700 px-5 text-xs font-bold text-white">{({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Save size={15} />}{isPending ? "در حال ذخیره..." : editing ? "ذخیره تغییرات" : "ذخیره پروموشن"}</>}</Button></div>
        </Card.Content></Card>
      </form>
      </> : null}

      {mode === "list" ?
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="m-0 text-base font-black">پروموشن‌های ثبت‌شده</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">وضعیت، مصرف و بازه هر کمپین را مدیریت کنید.</p></div><Chip size="sm" variant="soft"><Chip.Label>{items.length.toLocaleString("fa-IR")} مورد</Chip.Label></Chip></div>
        {items.length ? <div className="grid gap-2">{items.map((item) => <PromotionRow key={item.id} item={item} onEdit={() => editPromotion(item)} onToggle={() => void togglePromotion(item)} onDelete={() => { setDeleteError(""); setDeleting(item); }} />)}</div> : <div className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-10 text-center"><strong className="block text-sm">هنوز پروموشنی ثبت نشده است</strong><span className="mt-1 block text-xs text-[var(--muted)]">برای ساخت اولین کمپین از دکمه «پروموشن جدید» استفاده کنید.</span></div>}
      </Card.Content></Card>
      : null}

      {mode === "list" ? <DeleteConfirmDialog open={Boolean(deleting)} title="حذف پروموشن" itemName={deleting?.title} description="اگر این پروموشن سابقه استفاده یا پاداش داشته باشد حذف نمی‌شود و باید آن را غیرفعال کنید." error={deleteError} loading={deletingBusy} onClose={() => { setDeleting(null); setDeleteError(""); }} onConfirm={() => void confirmDelete()} /> : null}
    </div>
  );
}

function PromotionFields({ type, editing }: { type: PromotionType; editing: PromotionItem | null }) {
  const commonLimits = <><label className={adminLabelClass}>ظرفیت کل<HeroNumberInput name="usageLimit" defaultValue={editing?.usageLimit} min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label><label className={adminLabelClass}>سقف هر مشتری<HeroNumberInput name="perUserLimit" defaultValue={editing?.perUserLimit ?? 1} min="1" fullWidth variant="secondary" className={adminFieldClass} /></label></>;
  if (type === "COUPON") return <div className="grid gap-4 rounded-xl border border-violet-100 bg-violet-50/35 p-4 md:grid-cols-2 xl:grid-cols-4"><label className={adminLabelClass}>کد تخفیف<Input name="code" required dir="ltr" defaultValue={editing?.code ?? ""} fullWidth variant="secondary" className={`${adminFieldClass} uppercase`} placeholder="WELCOME20" /></label><HeroSelectField name="discountType" label="نوع تخفیف" defaultValue={editing?.discountType ?? "PERCENT"} includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} /><label className={adminLabelClass}>مقدار تخفیف<HeroNumberInput name="discountValue" defaultValue={editing?.discountValue} required min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً ۲۰" /></label><label className={adminLabelClass}>حداقل مبلغ سفارش<HeroNumberInput name="minOrderAmount" defaultValue={editing?.minOrderAmount} min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label><label className={adminLabelClass}>سقف تخفیف<HeroNumberInput name="maxDiscountAmount" defaultValue={editing?.maxDiscountAmount} min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون سقف" /></label>{commonLimits}</div>;
  if (type === "FREE_SHIPPING") return <div className="grid gap-4 rounded-xl border border-sky-100 bg-sky-50/35 p-4 md:grid-cols-2 xl:grid-cols-4"><label className={adminLabelClass}>حداقل مبلغ سفارش<HeroNumberInput name="minOrderAmount" defaultValue={editing?.minOrderAmount} min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label><HeroSelectField name="shippingScope" label="محدوده ارسال" defaultValue={editing?.shippingScope ?? "ALL"} includeEmptyOption={false} options={[{ value: "ALL", label: "تمام شهرها" }, { value: "TEHRAN", label: "فقط تهران" }]} />{commonLimits}</div>;
  if (type === "NEXT_PURCHASE") return <div className="grid gap-4 rounded-xl border border-amber-100 bg-amber-50/35 p-4 md:grid-cols-2 xl:grid-cols-4"><HeroSelectField name="discountType" label="نوع پاداش" defaultValue={editing?.discountType ?? "PERCENT"} includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "اعتبار مبلغی" }]} /><label className={adminLabelClass}>مقدار پاداش<HeroNumberInput name="discountValue" defaultValue={editing?.discountValue} required min="1" fullWidth variant="secondary" className={adminFieldClass} /></label><label className={adminLabelClass}>مهلت استفاده (روز)<HeroNumberInput name="rewardExpiresDays" defaultValue={editing?.rewardExpiresDays ?? 30} required min="1" fullWidth variant="secondary" className={adminFieldClass} /></label><label className={adminLabelClass}>حداقل مبلغ خرید فعلی<HeroNumberInput name="minOrderAmount" defaultValue={editing?.minOrderAmount} min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label><label className={adminLabelClass}>سقف تخفیف خرید بعدی<HeroNumberInput name="maxDiscountAmount" defaultValue={editing?.maxDiscountAmount} min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون سقف" /></label>{commonLimits}</div>;
  return <div className="grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50/35 p-4 md:grid-cols-2 xl:grid-cols-4"><HeroSelectField name="discountType" label="نوع تخفیف" defaultValue={editing?.discountType ?? "PERCENT"} includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} /><label className={adminLabelClass}>مقدار تخفیف<HeroNumberInput name="discountValue" defaultValue={editing?.discountValue} required min="1" fullWidth variant="secondary" className={adminFieldClass} /></label><label className={adminLabelClass}>حداقل مبلغ سفارش<HeroNumberInput name="minOrderAmount" defaultValue={editing?.minOrderAmount} min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label><label className={adminLabelClass}>سقف تخفیف<HeroNumberInput name="maxDiscountAmount" defaultValue={editing?.maxDiscountAmount} min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون سقف" /></label>{commonLimits}</div>;
}

function PromotionRow({ item, onEdit, onToggle, onDelete }: { item: PromotionItem; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const info = typeInfo(item.type);
  return <article className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 sm:flex-row sm:items-center"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${info.color}`}>{info.icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-xs">{item.title}</strong><Chip size="sm" variant="soft" className={item.isActive ? "text-emerald-700" : "text-slate-500"}><Chip.Label>{item.isActive ? "فعال" : "غیرفعال"}</Chip.Label></Chip>{item.code ? <code dir="ltr" className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-violet-700">{item.code}</code> : null}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--muted)]"><span>{info.title}</span><span>{item.startsAt} تا {item.endsAt}</span><span>{item.usageCount.toLocaleString("fa-IR")} استفاده</span>{item.rewardCount ? <span>{item.rewardCount.toLocaleString("fa-IR")} پاداش صادرشده</span> : null}</div></div><div className="flex shrink-0 items-center gap-1"><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={item.isActive ? `غیرفعال‌کردن ${item.title}` : `فعال‌کردن ${item.title}`} onPress={onToggle} className={item.isActive ? "text-emerald-600" : "text-slate-400"}>{item.isActive ? <Eye size={15} /> : <EyeOff size={15} />}</Button><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${item.title}`} onPress={onEdit}><Pencil size={14} /></Button><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف ${item.title}`} onPress={onDelete}><Trash2 size={14} /></Button></div></article>;
}
