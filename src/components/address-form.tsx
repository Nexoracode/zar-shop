"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button } from "@heroui/react";
import { Check, ChevronLeft } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { TextAreaField, TextField } from "@/components/form-field";
import { addressFieldLimits } from "@/modules/account/schemas";
import { validateAddressForm, validateAddressRecipient, type AddressFormErrors, type AddressFormField, type AddressRecipientErrors, type AddressRecipientField } from "@/modules/account/address-form-validation";

export type StorefrontAddress = {
  id: string; title: string; recipientType: "SELF" | "OTHER"; recipient: string; phone: string;
  provinceId: string | null; province: string; cityId: string | null; city: string; postalCode: string; addressLine: string;
  plaque: string | null; unit: string | null; floor: string | null; latitude: number | null; longitude: number | null; isDefault: boolean; lastUsedAt: string | null;
};

export type AddressFormStep = 2 | 3;
type Option = { id: string; name: string };

export function AddressForm({ initial, user, onSaved, onCancel, onStepChange }: { initial?: StorefrontAddress | null; user: { firstName: string | null; lastName: string | null; phone: string | null }; onSaved: (address: StorefrontAddress) => void; onCancel: () => void; onStepChange?: (step: AddressFormStep) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<AddressFormStep>(2);
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

  function goToConfirmation() {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const allErrors = validateAddressForm(readAddressValues(form));
    const fields: AddressFormField[] = ["provinceId", "cityId", "addressLine", "plaque", "postalCode"];
    const relevantErrors = Object.fromEntries(fields.flatMap((field) => allErrors[field] ? [[field, allErrors[field]]] : [])) as AddressFormErrors;
    setFieldErrors(relevantErrors);
    if (Object.keys(relevantErrors).length) return;
    setStep(3);
    onStepChange?.(3);
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

  const primaryButtonStyle = { "--button-bg": "var(--brand-primary)", "--button-bg-hover": "color-mix(in srgb, var(--brand-primary) 90%, black)", "--button-bg-pressed": "color-mix(in srgb, var(--brand-primary) 82%, black)", "--button-fg": "var(--brand-primary-foreground)" } as React.CSSProperties;

  return <form ref={formRef} onSubmit={submit} noValidate className="grid min-h-0" dir="rtl">
    <div className="grid gap-4 px-5 py-3 sm:px-6">
      <section className={step === 2 ? "grid gap-3" : "hidden"} aria-hidden={step !== 2}>
        <div className="grid items-start gap-3 sm:grid-cols-2">
          <HeroSelectField name="provinceIdField" label="استان" searchable value={provinceId} onValueChange={(value) => { setProvinceId(value); setCityId(""); setCities([]); setLocationsLoading(Boolean(value)); clearFieldError("provinceId"); }} required loading={locationsLoading && !provinces.length} error={fieldErrors.provinceId} reserveErrorSpace options={provinces.map((item) => ({ value: item.id, label: item.name }))} />
          <HeroSelectField name="cityIdField" label="شهر" searchable value={cityId} onValueChange={(value) => { setCityId(value); clearFieldError("cityId"); }} required disabled={!provinceId} loading={Boolean(provinceId) && locationsLoading} error={fieldErrors.cityId} reserveErrorSpace options={cities.map((item) => ({ value: item.id, label: item.name }))} />
        </div>
        <TextAreaField
          name="addressLine" label="آدرس" required rows={2}
          defaultValue={initial?.addressLine ?? ""}
          minLength={10} maxLength={addressFieldLimits.addressLine}
          placeholder="مثال: خیابان، کوچه و جزئیات آدرس"
          error={fieldErrors.addressLine}
          hint="در صورت تغییر این بخش و ناهماهنگی آن با موقعیت مکانی، ممکن است ارسال سفارش با مشکل مواجه شود."
          onChange={() => clearFieldError("addressLine")}
        />
        <div className="grid grid-cols-2 items-start gap-3">
          <TextField name="plaque" label="پلاک" required defaultValue={initial?.plaque ?? ""} maxLength={addressFieldLimits.plaque} error={fieldErrors.plaque} onChange={() => clearFieldError("plaque")} />
          <TextField name="unit" label="واحد" defaultValue={initial?.unit ?? ""} maxLength={addressFieldLimits.unit} />
        </div>
        <TextField
          name="postalCode" label="کدپستی" required dir="ltr" inputMode="numeric"
          defaultValue={initial?.postalCode ?? ""}
          minLength={addressFieldLimits.postalCode} maxLength={addressFieldLimits.postalCode}
          placeholder="باید ۱۰ رقمی باشد"
          error={fieldErrors.postalCode}
          onChange={() => clearFieldError("postalCode")}
        />
      </section>

      <section className={step === 3 ? "grid gap-5" : "hidden"} aria-hidden={step !== 3}>
        <TextField name="title" label="نام آدرس" required defaultValue={initial?.title ?? ""} maxLength={addressFieldLimits.title} placeholder="مثال: خانه، محل کار و ..." error={fieldErrors.title} onChange={() => clearFieldError("title")} />
        <div><p className="mb-3 mt-0 text-xs font-medium text-slate-700">سفارش‌های این آدرس را چه کسی تحویل می‌گیرد؟</p><div className="grid grid-cols-2 gap-3"><Button type="button" variant="ghost" aria-pressed={recipientType === "SELF"} onPress={() => { setRecipientType("SELF"); setRecipientErrors({}); }} className="min-h-11 justify-start gap-3 bg-transparent px-0 text-xs font-normal hover:bg-transparent data-[hovered=true]:bg-transparent"><span className={`grid size-5 place-items-center rounded-full border-2 ${recipientType === "SELF" ? "border-[var(--brand-primary)]" : "border-slate-400"}`}>{recipientType === "SELF" && <span className="size-2.5 rounded-full bg-[var(--brand-primary)]" />}</span>تحویل به خودم</Button><Button type="button" variant="ghost" aria-pressed={recipientType === "OTHER"} onPress={() => { setRecipientType("OTHER"); setRecipientErrors({}); }} className="min-h-11 justify-start gap-3 bg-transparent px-0 text-xs font-normal hover:bg-transparent data-[hovered=true]:bg-transparent"><span className={`grid size-5 place-items-center rounded-full border-2 ${recipientType === "OTHER" ? "border-[var(--brand-primary)]" : "border-slate-400"}`}>{recipientType === "OTHER" && <span className="size-2.5 rounded-full bg-[var(--brand-primary)]" />}</span>تحویل به شخص دیگر</Button></div></div>
        {recipientType === "SELF" ? (
          <div className="rounded-lg bg-[var(--surface-secondary)] px-4 py-3 text-xs leading-6 text-[var(--muted)]">گیرنده: <b className="text-[var(--foreground)]">{selfName || "اطلاعات پروفایل ناقص"}</b>{user.phone && <span className="mr-2" dir="ltr">{user.phone}</span>}{(recipientErrors.recipient || recipientErrors.phone) && <span role="alert" className="mt-1 block text-[var(--danger)]">{recipientErrors.recipient ?? recipientErrors.phone}</span>}</div>
        ) : (
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <TextField name="recipient" label="نام و نام خانوادگی" required defaultValue={initial?.recipientType === "OTHER" ? initial.recipient : ""} maxLength={addressFieldLimits.recipient} error={recipientErrors.recipient} onChange={() => clearRecipientError("recipient")} />
            <TextField name="phone" label="شماره همراه" required dir="ltr" inputMode="tel" defaultValue={initial?.recipientType === "OTHER" ? initial.phone : ""} maxLength={addressFieldLimits.phone} error={recipientErrors.phone} onChange={() => clearRecipientError("phone")} />
          </div>
        )}
      </section>

      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
    </div>

    <div className="sticky bottom-0 z-10 flex gap-3 border-t border-[var(--border)] bg-white px-5 py-2.5 sm:px-6">{step === 2 ? <Button type="button" variant="primary" isDisabled={locationsLoading} onPress={goToConfirmation} style={primaryButtonStyle} className="mr-auto min-h-10 min-w-44 justify-center gap-2 rounded-lg px-6 text-sm font-bold"><span>تأیید و ادامه</span><ChevronLeft size={16} /></Button> : <><Button type="button" variant="outline" fullWidth isDisabled={saving} onPress={onCancel} className="min-h-10 flex-1 rounded-lg border border-[var(--brand-primary)] bg-white text-sm font-bold text-[var(--brand-primary)]">انصراف</Button><Button type="submit" variant="primary" fullWidth isPending={saving} isDisabled={saving} style={primaryButtonStyle} className="min-h-10 flex-1 justify-center gap-2 rounded-lg px-5 text-sm font-bold"><Check size={16} /><span>ذخیره آدرس</span></Button></>}</div>
  </form>;
}
