"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Input, Spinner, TextArea } from "@heroui/react";
import { Check } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { validateAddressForm, type AddressFormErrors, type AddressFormField } from "@/modules/account/address-form-validation";

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
  const [fieldErrors, setFieldErrors] = useState<AddressFormErrors>({});
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
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const values = {
      provinceId,
      cityId,
      addressLine: String(form.get("addressLine") ?? ""),
      plaque: String(form.get("plaque") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      title: String(form.get("title") ?? ""),
    };
    const validationErrors = validateAddressForm(values);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    setSaving(true);
    const payload = {
      title: form.get("title"), recipientType: initial?.recipientType ?? "SELF", recipient: initial?.recipient ?? selfName, recipientNationalId: initial?.recipientNationalId ?? "", phone: initial?.phone ?? user.phone ?? "",
      provinceId, cityId, postalCode: form.get("postalCode"), addressLine: form.get("addressLine"), plaque: form.get("plaque"), unit: form.get("unit"), floor: form.get("floor"),
    };
    try {
      const response = await fetch(initial ? `/api/account/addresses/${initial.id}` : "/api/account/addresses", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(initial ? { action: "update", data: payload } : payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت نشانی انجام نشد.");
      onSaved(result.item as StorefrontAddress);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ثبت نشانی انجام نشد."); }
    finally { setSaving(false); }
  }

  function clearFieldError(field: AddressFormField) {
    setFieldErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
  }

  const fieldClass = "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
  const labelClass = "grid gap-2 text-xs font-medium text-slate-600";
  const selectClass = "min-h-12 rounded-lg border-slate-300";
  const invalidFieldClass = "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/15";
  const fieldError = (field: AddressFormField) => fieldErrors[field] && <span role="alert" className="text-[11px] font-normal text-[var(--danger)]">{fieldErrors[field]}</span>;
  return <form onSubmit={submit} noValidate className="grid gap-6 px-5 pt-5" dir="rtl">
    <div className="grid gap-4 sm:grid-cols-2"><HeroSelectField name="provinceIdField" label="استان" searchable value={provinceId} onValueChange={(value) => { setProvinceId(value); setCityId(""); setCities([]); setLocationsLoading(Boolean(value)); clearFieldError("provinceId"); }} required disabled={locationsLoading && !provinces.length} error={fieldErrors.provinceId} options={provinces.map((item) => ({ value: item.id, label: item.name }))} controlClassName={selectClass} /><HeroSelectField name="cityIdField" label="شهر" searchable value={cityId} onValueChange={(value) => { setCityId(value); clearFieldError("cityId"); }} required disabled={!provinceId || locationsLoading} error={fieldErrors.cityId} options={cities.map((item) => ({ value: item.id, label: item.name }))} controlClassName={selectClass} /></div>
    <label className={labelClass}><span>آدرس<span className="mr-0.5 text-[var(--danger)]">*</span></span><TextArea name="addressLine" defaultValue={initial?.addressLine ?? ""} onChange={() => clearFieldError("addressLine")} aria-invalid={Boolean(fieldErrors.addressLine)} minLength={10} maxLength={1000} rows={2} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.addressLine ? invalidFieldClass : ""}`} placeholder="مثال: خیابان، کوچه و جزئیات آدرس" />{fieldError("addressLine")}<span className="text-[11px] font-normal leading-6 text-slate-400">در صورت تغییر این بخش و ناهماهنگی آن با موقعیت مکانی، ممکن است ارسال سفارش با مشکل مواجه شود.</span></label>
    <div className="grid grid-cols-2 gap-4"><label className={labelClass}><span>پلاک<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="plaque" defaultValue={initial?.plaque ?? ""} onChange={() => clearFieldError("plaque")} aria-invalid={Boolean(fieldErrors.plaque)} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.plaque ? invalidFieldClass : ""}`} />{fieldError("plaque")}</label><label className={labelClass}>واحد<Input name="unit" defaultValue={initial?.unit ?? ""} fullWidth variant="secondary" className={fieldClass} /></label></div>
    <div className="grid grid-cols-2 gap-4"><label className={labelClass}><span>کدپستی<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="postalCode" defaultValue={initial?.postalCode ?? ""} onChange={() => clearFieldError("postalCode")} aria-invalid={Boolean(fieldErrors.postalCode)} dir="ltr" inputMode="numeric" minLength={10} maxLength={10} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.postalCode ? invalidFieldClass : ""}`} placeholder="باید ۱۰ رقمی باشد" />{fieldError("postalCode")}</label><label className={labelClass}>طبقه<Input name="floor" defaultValue={initial?.floor ?? ""} fullWidth variant="secondary" className={fieldClass} /></label></div>
    <label className={labelClass}><span>عنوان آدرس<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="title" defaultValue={initial?.title ?? "خانه"} onChange={() => clearFieldError("title")} aria-invalid={Boolean(fieldErrors.title)} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.title ? invalidFieldClass : ""}`} placeholder="مثلاً خانه یا محل کار" />{fieldError("title")}</label>
    {locationsLoading && <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Spinner size="sm" />در حال دریافت اطلاعات استان و شهر…</div>}
    {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
    <div className="sticky bottom-0 z-10 -mx-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-white px-5 py-4 sm:flex-row sm:justify-end"><Button type="submit" variant="primary" fullWidth isPending={saving} isDisabled={saving || locationsLoading} style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }} className="min-h-12 justify-center gap-2 rounded-lg border border-[var(--brand-primary)] px-6 font-black shadow-sm transition hover:brightness-105 sm:w-auto sm:min-w-44"><Check size={17} /> <span>{initial ? "ذخیره تغییرات" : "تأیید و ثبت آدرس"}</span></Button>{initial && <Button type="button" variant="ghost" isDisabled={saving} onPress={onCancel} className="min-h-12 px-4 text-[var(--muted)]">انصراف</Button>}</div>
  </form>;
}
