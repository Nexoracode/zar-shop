"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Input, Spinner, TextArea } from "@heroui/react";
import { Check, ChevronLeft } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { validateAddressForm, validateAddressRecipient, type AddressFormErrors, type AddressFormField, type AddressRecipientErrors, type AddressRecipientField } from "@/modules/account/address-form-validation";

export type StorefrontAddress = {
  id: string; title: string; recipientType: "SELF" | "OTHER"; recipient: string; phone: string;
  provinceId: string | null; province: string; cityId: string | null; city: string; postalCode: string; addressLine: string;
  plaque: string | null; unit: string | null; floor: string | null; latitude: number | null; longitude: number | null; isDefault: boolean; lastUsedAt: string | null;
};

export type AddressFormStep = 1 | 2 | 3;
type Option = { id: string; name: string };

export function AddressForm({ initial, user, onSaved, onCancel, onStepChange }: { initial?: StorefrontAddress | null; user: { firstName: string | null; lastName: string | null; phone: string | null }; onSaved: (address: StorefrontAddress) => void; onCancel: () => void; onStepChange?: (step: AddressFormStep) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<AddressFormStep>(1);
  const [recipientType, setRecipientType] = useState<"SELF" | "OTHER">(initial?.recipientType ?? "SELF");
  const [provinceId, setProvinceId] = useState(initial?.provinceId ?? "");
  const [cityId, setCityId] = useState(initial?.cityId ?? "");
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AddressFormErrors>({});
  const [recipientErrors, setRecipientErrors] = useState<AddressRecipientErrors>({});
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

  function readAddressValues(form: FormData) {
    return {
      provinceId,
      cityId,
      addressLine: String(form.get("addressLine") ?? ""),
      plaque: String(form.get("plaque") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      title: String(form.get("title") ?? ""),
    };
  }

  function goToStep(nextStep: 2 | 3) {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const allErrors = validateAddressForm(readAddressValues(form));
    const fields: AddressFormField[] = nextStep === 2 ? ["addressLine"] : ["provinceId", "cityId", "plaque", "postalCode"];
    const relevantErrors = Object.fromEntries(fields.flatMap((field) => allErrors[field] ? [[field, allErrors[field]]] : [])) as AddressFormErrors;
    setFieldErrors(relevantErrors);
    if (Object.keys(relevantErrors).length) return;
    setStep(nextStep);
    onStepChange?.(nextStep);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const validationErrors = validateAddressForm(readAddressValues(form));
    const nextRecipientErrors = validateAddressRecipient({ recipientType, recipient: recipientType === "SELF" ? selfName : String(form.get("recipient") ?? ""), phone: recipientType === "SELF" ? user.phone ?? "" : String(form.get("phone") ?? "") });
    setFieldErrors(validationErrors);
    setRecipientErrors(nextRecipientErrors);
    if (Object.keys(validationErrors).length || Object.keys(nextRecipientErrors).length) return;
    setSaving(true);
    const payload = {
      title: form.get("title"),
      recipientType,
      recipient: recipientType === "SELF" ? selfName : form.get("recipient"),
      phone: recipientType === "SELF" ? user.phone ?? "" : form.get("phone"),
      provinceId,
      cityId,
      postalCode: form.get("postalCode"),
      addressLine: form.get("addressLine"),
      plaque: form.get("plaque"),
      unit: form.get("unit"),
      floor: "",
    };
    try {
      const response = await fetch(initial ? `/api/account/addresses/${initial.id}` : "/api/account/addresses", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(initial ? { action: "update", data: payload } : payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت آدرس انجام نشد.");
      onSaved(result.item as StorefrontAddress);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ثبت آدرس انجام نشد."); }
    finally { setSaving(false); }
  }

  function clearFieldError(field: AddressFormField) {
    setFieldErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
  }

  function clearRecipientError(field: AddressRecipientField) {
    setRecipientErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
  }

  const fieldClass = "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
  const inputFieldClass = `${fieldClass} h-12 max-h-12`;
  const labelClass = "grid content-start gap-2 text-xs font-medium text-slate-600";
  const selectClass = "min-h-12 rounded-lg border-slate-300";
  const invalidFieldClass = "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/15";
  const fieldError = (field: AddressFormField) => <span role={fieldErrors[field] ? "alert" : undefined} aria-hidden={fieldErrors[field] ? undefined : true} className={`block min-h-4 text-[11px] font-normal ${fieldErrors[field] ? "text-[var(--danger)]" : "invisible"}`}>{fieldErrors[field] ?? "بدون خطا"}</span>;
  const recipientError = (field: AddressRecipientField) => <span role={recipientErrors[field] ? "alert" : undefined} aria-hidden={recipientErrors[field] ? undefined : true} className={`block min-h-4 text-[11px] font-normal ${recipientErrors[field] ? "text-[var(--danger)]" : "invisible"}`}>{recipientErrors[field] ?? "بدون خطا"}</span>;
  const primaryButtonStyle = { "--button-bg": "var(--brand-primary)", "--button-bg-hover": "color-mix(in srgb, var(--brand-primary) 90%, black)", "--button-bg-pressed": "color-mix(in srgb, var(--brand-primary) 82%, black)", "--button-fg": "var(--brand-primary-foreground)" } as React.CSSProperties;

  return <form ref={formRef} onSubmit={submit} noValidate className="grid min-h-0" dir="rtl">
    <div className="grid gap-5 px-5 py-4 sm:px-6">
      <section className={step === 1 ? "grid gap-5" : "hidden"} aria-hidden={step !== 1}>
        <label className={labelClass}><span>آدرس<span className="mr-0.5 text-[var(--danger)]">*</span></span><TextArea name="addressLine" defaultValue={initial?.addressLine ?? ""} onChange={() => clearFieldError("addressLine")} aria-invalid={Boolean(fieldErrors.addressLine)} minLength={10} maxLength={1000} rows={2} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.addressLine ? invalidFieldClass : ""}`} placeholder="مثال: خیابان، کوچه و جزئیات آدرس" />{fieldError("addressLine")}<span className="text-[11px] font-normal leading-5 text-slate-400">آدرس را دقیق و مطابق اطلاعات پستی وارد کنید.</span></label>
      </section>

      <section className={step === 2 ? "grid gap-5" : "hidden"} aria-hidden={step !== 2}>
        <div className="grid items-start gap-4 sm:grid-cols-2"><HeroSelectField name="provinceIdField" label="استان" searchable value={provinceId} onValueChange={(value) => { setProvinceId(value); setCityId(""); setCities([]); setLocationsLoading(Boolean(value)); clearFieldError("provinceId"); }} required disabled={locationsLoading && !provinces.length} error={fieldErrors.provinceId} reserveErrorSpace options={provinces.map((item) => ({ value: item.id, label: item.name }))} controlClassName={selectClass} /><HeroSelectField name="cityIdField" label="شهر" searchable value={cityId} onValueChange={(value) => { setCityId(value); clearFieldError("cityId"); }} required disabled={!provinceId || locationsLoading} error={fieldErrors.cityId} reserveErrorSpace options={cities.map((item) => ({ value: item.id, label: item.name }))} controlClassName={selectClass} /></div>
        <div className="grid grid-cols-2 items-start gap-4"><label className={labelClass}><span>پلاک<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="plaque" defaultValue={initial?.plaque ?? ""} onChange={() => clearFieldError("plaque")} aria-invalid={Boolean(fieldErrors.plaque)} fullWidth variant="secondary" className={`${inputFieldClass} ${fieldErrors.plaque ? invalidFieldClass : ""}`} />{fieldError("plaque")}</label><label className={labelClass}>واحد<Input name="unit" defaultValue={initial?.unit ?? ""} fullWidth variant="secondary" className={inputFieldClass} /><span aria-hidden="true" className="block min-h-4" /></label></div>
        <label className={labelClass}><span>کدپستی<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="postalCode" defaultValue={initial?.postalCode ?? ""} onChange={() => clearFieldError("postalCode")} aria-invalid={Boolean(fieldErrors.postalCode)} dir="ltr" inputMode="numeric" minLength={10} maxLength={10} fullWidth variant="secondary" className={`${inputFieldClass} ${fieldErrors.postalCode ? invalidFieldClass : ""}`} placeholder="باید ۱۰ رقمی باشد" />{fieldError("postalCode")}</label>
      </section>

      <section className={step === 3 ? "grid gap-5" : "hidden"} aria-hidden={step !== 3}>
        <label className={labelClass}><span>نام آدرس<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="title" defaultValue={initial?.title ?? ""} onChange={() => clearFieldError("title")} aria-invalid={Boolean(fieldErrors.title)} fullWidth variant="secondary" className={`${inputFieldClass} ${fieldErrors.title ? invalidFieldClass : ""}`} placeholder="مثال: خانه، محل کار و ..." />{fieldError("title")}</label>
        <div><p className="mb-3 mt-0 text-xs font-medium text-slate-700">سفارش‌های این آدرس را چه کسی تحویل می‌گیرد؟</p><div className="grid grid-cols-2 gap-3"><Button type="button" variant="ghost" aria-pressed={recipientType === "SELF"} onPress={() => { setRecipientType("SELF"); setRecipientErrors({}); }} className="min-h-11 justify-start gap-3 bg-transparent px-0 text-xs font-normal hover:bg-transparent data-[hovered=true]:bg-transparent"><span className={`grid size-5 place-items-center rounded-full border-2 ${recipientType === "SELF" ? "border-[var(--brand-primary)]" : "border-slate-400"}`}>{recipientType === "SELF" && <span className="size-2.5 rounded-full bg-[var(--brand-primary)]" />}</span>تحویل به خودم</Button><Button type="button" variant="ghost" aria-pressed={recipientType === "OTHER"} onPress={() => { setRecipientType("OTHER"); setRecipientErrors({}); }} className="min-h-11 justify-start gap-3 bg-transparent px-0 text-xs font-normal hover:bg-transparent data-[hovered=true]:bg-transparent"><span className={`grid size-5 place-items-center rounded-full border-2 ${recipientType === "OTHER" ? "border-[var(--brand-primary)]" : "border-slate-400"}`}>{recipientType === "OTHER" && <span className="size-2.5 rounded-full bg-[var(--brand-primary)]" />}</span>تحویل به شخص دیگر</Button></div></div>
        {recipientType === "SELF" ? <div className="rounded-lg bg-[var(--surface-secondary)] px-4 py-3 text-xs leading-6 text-[var(--muted)]">گیرنده: <b className="text-[var(--foreground)]">{selfName || "اطلاعات پروفایل ناقص"}</b>{user.phone && <span className="mr-2" dir="ltr">{user.phone}</span>}{(recipientErrors.recipient || recipientErrors.phone) && <span role="alert" className="mt-1 block text-[var(--danger)]">{recipientErrors.recipient ?? recipientErrors.phone}</span>}</div> : <div className="grid items-start gap-4 sm:grid-cols-2"><label className={labelClass}><span>نام و نام خانوادگی<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="recipient" defaultValue={initial?.recipientType === "OTHER" ? initial.recipient : ""} onChange={() => clearRecipientError("recipient")} aria-invalid={Boolean(recipientErrors.recipient)} fullWidth variant="secondary" className={`${inputFieldClass} ${recipientErrors.recipient ? invalidFieldClass : ""}`} />{recipientError("recipient")}</label><label className={labelClass}><span>شماره همراه<span className="mr-0.5 text-[var(--danger)]">*</span></span><Input name="phone" defaultValue={initial?.recipientType === "OTHER" ? initial.phone : ""} onChange={() => clearRecipientError("phone")} aria-invalid={Boolean(recipientErrors.phone)} dir="ltr" inputMode="tel" fullWidth variant="secondary" className={`${inputFieldClass} ${recipientErrors.phone ? invalidFieldClass : ""}`} />{recipientError("phone")}</label></div>}
      </section>

      {locationsLoading && step === 2 && <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Spinner size="sm" />در حال دریافت اطلاعات استان و شهر…</div>}
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
    </div>

    <div className="sticky bottom-0 z-10 flex gap-3 border-t border-[var(--border)] bg-white px-5 py-3 sm:px-6">{step < 3 ? <Button type="button" variant="primary" fullWidth isDisabled={step === 2 && locationsLoading} onPress={() => goToStep(step === 1 ? 2 : 3)} style={primaryButtonStyle} className="min-h-10 justify-center gap-2 rounded-lg px-6 text-sm font-black"><span>تأیید و ادامه</span><ChevronLeft size={16} /></Button> : <><Button type="button" variant="outline" fullWidth isDisabled={saving} onPress={onCancel} className="min-h-10 flex-1 rounded-lg border border-[var(--brand-primary)] bg-white text-sm font-bold text-[var(--brand-primary)]">انصراف</Button><Button type="submit" variant="primary" fullWidth isPending={saving} isDisabled={saving} style={primaryButtonStyle} className="min-h-10 flex-1 justify-center gap-2 rounded-lg px-5 text-sm font-black"><Check size={16} /><span>ذخیره آدرس</span></Button></>}</div>
  </form>;
}
