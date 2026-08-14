"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Input, Spinner, TextArea } from "@heroui/react";
import { Check, UserRound, UsersRound } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";

export type StorefrontAddress = {
  id: string; title: string; recipientType: "SELF" | "OTHER"; recipient: string; recipientNationalId: string | null; phone: string;
  provinceId: string | null; province: string; cityId: string | null; city: string; postalCode: string; addressLine: string;
  plaque: string | null; unit: string | null; floor: string | null; latitude: number | null; longitude: number | null; isDefault: boolean; lastUsedAt: string | null;
};

type Option = { id: string; name: string };

export function AddressForm({ initial, user, onSaved, onCancel }: { initial?: StorefrontAddress | null; user: { firstName: string | null; lastName: string | null; phone: string | null }; onSaved: (address: StorefrontAddress) => void; onCancel: () => void }) {
  const [recipientType, setRecipientType] = useState<"SELF" | "OTHER">(initial?.recipientType ?? "SELF");
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
      title: form.get("title"), recipientType, recipient: form.get("recipient"), recipientNationalId: recipientType === "OTHER" ? form.get("recipientNationalId") : "", phone: form.get("phone"),
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

  const fieldClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
  const labelClass = "grid gap-2 text-xs font-bold text-[var(--foreground)]";
  const recipientName = initial?.recipient ?? selfName;
  const recipientPhone = initial?.phone ?? user.phone ?? "";

  return <form onSubmit={submit} className="grid gap-5" dir="rtl">
    <section><strong className="mb-3 block text-sm">تحویل‌گیرنده سفارش</strong><div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="secondary" onPress={() => setRecipientType("SELF")} className={`h-auto min-h-16 justify-start gap-3 rounded-xl border px-4 text-right ${recipientType === "SELF" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><UserRound size={20} /><span><b className="block">خودم</b><small className="font-normal text-[var(--muted)]">تحویل به صاحب حساب</small></span>{recipientType === "SELF" && <Check size={17} className="mr-auto" />}</Button><Button type="button" variant="secondary" onPress={() => setRecipientType("OTHER")} className={`h-auto min-h-16 justify-start gap-3 rounded-xl border px-4 text-right ${recipientType === "OTHER" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><UsersRound size={20} /><span><b className="block">شخص دیگر</b><small className="font-normal text-[var(--muted)]">ارسال هدیه یا تحویل به دیگری</small></span>{recipientType === "OTHER" && <Check size={17} className="mr-auto" />}</Button></div></section>
    <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>عنوان نشانی<Input name="title" defaultValue={initial?.title ?? "خانه"} required fullWidth variant="secondary" className={fieldClass} placeholder="مثلاً خانه یا محل کار" /></label><label className={labelClass}>نام و نام خانوادگی گیرنده<Input key={`${initial?.id ?? "new"}-${recipientType}-name`} name="recipient" defaultValue={recipientType === "SELF" ? selfName || recipientName : initial?.recipientType === "OTHER" ? recipientName : ""} required fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>شماره موبایل گیرنده<Input key={`${initial?.id ?? "new"}-${recipientType}-phone`} name="phone" defaultValue={recipientType === "SELF" ? user.phone ?? recipientPhone : initial?.recipientType === "OTHER" ? recipientPhone : ""} required dir="ltr" inputMode="tel" pattern="09[0-9]{9}" fullWidth variant="secondary" className={fieldClass} /></label>{recipientType === "OTHER" && <label className={labelClass}>کد ملی گیرنده<Input name="recipientNationalId" defaultValue={initial?.recipientNationalId ?? ""} required dir="ltr" inputMode="numeric" minLength={10} maxLength={10} fullWidth variant="secondary" className={fieldClass} /></label>}</div>
    <div className="grid gap-4 sm:grid-cols-2"><HeroSelectField name="provinceIdField" label="استان" searchable value={provinceId} onValueChange={(value) => { setProvinceId(value); setCityId(""); setCities([]); setLocationsLoading(Boolean(value)); }} required disabled={locationsLoading && !provinces.length} options={provinces.map((item) => ({ value: item.id, label: item.name }))} /><HeroSelectField name="cityIdField" label="شهر" searchable value={cityId} onValueChange={setCityId} required disabled={!provinceId || locationsLoading} options={cities.map((item) => ({ value: item.id, label: item.name }))} /></div>
    <label className={labelClass}>نشانی پستی<TextArea name="addressLine" defaultValue={initial?.addressLine ?? ""} required minLength={10} maxLength={1000} rows={3} fullWidth variant="secondary" className={fieldClass} placeholder="خیابان، کوچه و جزئیات کامل دسترسی" /></label>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><label className={labelClass}>پلاک<Input name="plaque" defaultValue={initial?.plaque ?? ""} required fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>واحد<Input name="unit" defaultValue={initial?.unit ?? ""} fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>طبقه<Input name="floor" defaultValue={initial?.floor ?? ""} fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>کد پستی<Input name="postalCode" defaultValue={initial?.postalCode ?? ""} required dir="ltr" inputMode="numeric" minLength={10} maxLength={10} fullWidth variant="secondary" className={fieldClass} /></label></div>
    <Button type="button" variant="secondary" onPress={() => setIsDefault((value) => !value)} aria-pressed={isDefault} className={`min-h-12 justify-start gap-3 rounded-xl border px-4 ${isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]" : "border-[var(--border)]"}`}><span className={`grid size-5 place-items-center rounded border ${isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-[var(--border)]"}`}>{isDefault && <Check size={14} />}</span>این نشانی، انتخاب پیش‌فرض تحویل باشد</Button>
    {locationsLoading && <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Spinner size="sm" />در حال دریافت اطلاعات استان و شهر…</div>}
    {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
    <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4"><Button type="submit" variant="primary" isPending={saving} isDisabled={!provinceId || !cityId || locationsLoading} className="min-h-11 px-6">ذخیره نشانی</Button><Button type="button" variant="secondary" isDisabled={saving} onPress={onCancel} className="min-h-11 px-5">انصراف</Button></div>
  </form>;
}
