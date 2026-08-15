"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Input, Spinner, TextArea } from "@heroui/react";
import { Check } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";

export type StorefrontAddress = {
  id: string; title: string; recipientType: "SELF" | "OTHER"; recipient: string; recipientNationalId: string | null; phone: string;
  provinceId: string | null; province: string; cityId: string | null; city: string; postalCode: string; addressLine: string;
  plaque: string | null; unit: string | null; floor: string | null; latitude: number | null; longitude: number | null; isDefault: boolean; lastUsedAt: string | null;
};

type Option = { id: string; name: string };

export function AddressForm({ initial, user, onSaved, onCancel }: { initial?: StorefrontAddress | null; user: { firstName: string | null; lastName: string | null; phone: string | null }; onSaved: (address: StorefrontAddress) => void; onCancel: () => void }) {
  const [provinceId, setProvinceId] = useState(initial?.provinceId ?? "");
  const [cityId, setCityId] = useState(initial?.cityId ?? "");
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const selfName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  useEffect(() => {
    let active = true;
    void fetch("/api/locations/provinces").then((response) => response.json()).then((result) => { if (active) setProvinces(result.items ?? []); }).catch(() => { if (active) setError("دریافت فهرست استان‌ها انجام نشد."); }).finally(() => { if (active) setLocationsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!provinceId) return;
    let active = true;
    void fetch(`/api/locations/cities?provinceId=${encodeURIComponent(provinceId)}`).then((response) => response.json()).then((result) => { if (active) setCities(result.items ?? []); }).catch(() => { if (active) setError("دریافت فهرست شهرها انجام نشد."); }).finally(() => { if (active) setLocationsLoading(false); });
    return () => { active = false; };
  }, [provinceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"), recipientType: initial?.recipientType ?? "SELF", recipient: initial?.recipient ?? selfName, recipientNationalId: initial?.recipientNationalId ?? "", phone: initial?.phone ?? user.phone ?? "",
      provinceId, cityId, postalCode: form.get("postalCode"), addressLine: form.get("addressLine"), plaque: form.get("plaque"), unit: form.get("unit"), floor: form.get("floor"), isDefault,
    };
    try {
      const response = await fetch(initial ? `/api/account/addresses/${initial.id}` : "/api/account/addresses", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(initial ? { action: "update", data: payload } : payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت نشانی انجام نشد.");
      onSaved(result.item as StorefrontAddress);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ثبت نشانی انجام نشد."); }
    finally { setSaving(false); }
  }

  const fieldClass = "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
  const labelClass = "grid gap-2 text-xs font-medium text-slate-600";
  const selectClass = "min-h-12 rounded-lg border-slate-300";
  return <form onSubmit={submit} className="grid gap-6 px-5 pt-5" dir="rtl">
    <div className="grid gap-4 sm:grid-cols-2"><HeroSelectField name="provinceIdField" label="استان" searchable value={provinceId} onValueChange={(value) => { setProvinceId(value); setCityId(""); setCities([]); setLocationsLoading(Boolean(value)); }} required disabled={locationsLoading && !provinces.length} options={provinces.map((item) => ({ value: item.id, label: item.name }))} controlClassName={selectClass} /><HeroSelectField name="cityIdField" label="شهر" searchable value={cityId} onValueChange={setCityId} required disabled={!provinceId || locationsLoading} options={cities.map((item) => ({ value: item.id, label: item.name }))} controlClassName={selectClass} /></div>
    <label className={labelClass}><span>آدرس<span className="mr-0.5 text-[var(--danger)]">*</span></span><TextArea name="addressLine" defaultValue={initial?.addressLine ?? ""} required minLength={10} maxLength={1000} rows={2} fullWidth variant="secondary" className={fieldClass} placeholder="مثال: خیابان، کوچه و جزئیات آدرس" /><span className="text-[11px] font-normal leading-6 text-slate-400">در صورت تغییر این بخش و ناهماهنگی آن با موقعیت مکانی، ممکن است ارسال سفارش با مشکل مواجه شود.</span></label>
    <div className="grid grid-cols-2 gap-4"><label className={labelClass}><span>پلاک<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="plaque" defaultValue={initial?.plaque ?? ""} required fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>واحد<Input name="unit" defaultValue={initial?.unit ?? ""} fullWidth variant="secondary" className={fieldClass} /></label></div>
    <div className="grid grid-cols-2 gap-4"><label className={labelClass}><span>کدپستی<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="postalCode" defaultValue={initial?.postalCode ?? ""} required dir="ltr" inputMode="numeric" minLength={10} maxLength={10} fullWidth variant="secondary" className={fieldClass} placeholder="باید ۱۰ رقمی باشد" /></label><label className={labelClass}>طبقه<Input name="floor" defaultValue={initial?.floor ?? ""} fullWidth variant="secondary" className={fieldClass} /></label></div>
    <label className={labelClass}>عنوان آدرس<Input name="title" defaultValue={initial?.title ?? "خانه"} required fullWidth variant="secondary" className={fieldClass} placeholder="مثلاً خانه یا محل کار" /></label>
    <Button type="button" variant="secondary" onPress={() => setIsDefault((value) => !value)} aria-pressed={isDefault} className={`min-h-12 justify-start gap-3 rounded-lg border px-4 ${isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]" : "border-[var(--border)]"}`}><span className={`grid size-5 place-items-center rounded border ${isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-[var(--border)]"}`}>{isDefault && <Check size={14} />}</span>این آدرس، انتخاب پیش‌فرض تحویل باشد</Button>
    {locationsLoading && <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Spinner size="sm" />در حال دریافت اطلاعات استان و شهر…</div>}
    {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
    <div className="sticky bottom-0 z-10 -mx-5 flex justify-end border-t border-[var(--border)] bg-white px-5 py-4"><Button type="submit" variant="primary" isPending={saving} isDisabled={!provinceId || !cityId || locationsLoading} className="min-h-12 min-w-44 rounded-lg bg-[var(--brand-primary)] px-6 font-black text-[var(--brand-primary-foreground)]">{initial ? "ذخیره تغییرات" : "تأیید و ادامه"}</Button>{initial && <Button type="button" variant="ghost" isDisabled={saving} onPress={onCancel} className="mr-2 min-h-12 px-4 text-[var(--muted)]">انصراف</Button>}</div>
  </form>;
}
