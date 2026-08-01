"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Alert, Button, Card, Chip, Input, toast } from "@heroui/react";
import { CheckCircle2, CreditCard, ExternalLink, Eye, EyeOff, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { adminFieldClass } from "@/components/admin-ui";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { gatewayProviders, type GatewayProviderId } from "@/modules/payments/gateway-providers";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";

export function PaymentGatewayManager({ initialConfigs }: { initialConfigs: PublicGatewayConfig[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [selectedId, setSelectedId] = useState<GatewayProviderId>("ZARINPAL");
  const [credential, setCredential] = useState("");
  const [isSandbox, setIsSandbox] = useState(false);
  const [showCredential, setShowCredential] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<GatewayProviderId | null>(null);
  const selected = useMemo(() => gatewayProviders.find((provider) => provider.id === selectedId)!, [selectedId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/admin/payment-gateways", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: selectedId, credential, isSandbox }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت درگاه انجام نشد.");
      setConfigs(result as PublicGatewayConfig[]); setCredential(""); setShowCredential(false);
      toast.success(`${selected.name} ثبت شد`, { description: "اطلاعات اتصال به‌صورت رمزنگاری‌شده ذخیره شد." });
    } catch (reason) { toast.danger("ثبت درگاه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); }
    finally { setSaving(false); }
  }

  async function remove(provider: GatewayProviderId) {
    setDeleting(provider);
    try {
      const response = await fetch(`/api/admin/payment-gateways?provider=${provider}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف درگاه انجام نشد.");
      setConfigs(result as PublicGatewayConfig[]);
      toast.success("درگاه حذف شد");
    } catch (reason) { toast.danger("حذف درگاه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); }
    finally { setDeleting(null); }
  }

  return <div className="grid gap-5" dir="rtl">
    <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4"><h2 className="m-0 text-base font-black">درگاه‌های پیشنهادی</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">درگاه موردنظر را انتخاب کنید تا راهنمای دریافت شناسه آن نمایش داده شود.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{gatewayProviders.map((provider) => {
        const configured = configs.some((config) => config.provider === provider.id);
        return <Button key={provider.id} type="button" variant={selectedId === provider.id ? "primary" : "secondary"} onPress={() => { setSelectedId(provider.id); setCredential(""); setIsSandbox(false); }} className="h-auto min-h-20 justify-start gap-3 px-4 py-3 text-right">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${selectedId === provider.id ? "bg-white/15" : "bg-[var(--accent)]/10 text-[var(--accent)]"}`}><CreditCard size={19} /></span>
          <span className="min-w-0"><strong className="block text-sm">{provider.name}</strong><span className="mt-1 block text-[10px] opacity-75">{configured ? "قبلاً ثبت شده" : "قابل افزودن"}</span></span>
        </Button>;
      })}</div>
    </Card>

    <form onSubmit={submit} className="grid gap-5">
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><ShieldCheck size={20} /></span><div><h2 className="m-0 text-base font-black">فعال‌سازی {selected.name}</h2><p className="m-0 mt-1 text-xs text-[var(--muted)]">ابتدا شناسه اتصال را از پنل رسمی درگاه دریافت کنید.</p></div></div>
        <ol className="m-0 grid list-none gap-3 p-0">{selected.steps.map((step, index) => <li key={step} className="flex items-start gap-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-xs leading-6"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/10 font-black text-[var(--accent)]">{(index + 1).toLocaleString("fa-IR")}</span><span>{step}</span></li>)}</ol>
        <a href={selected.signupUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--accent)]">ورود به سایت رسمی {selected.name}<ExternalLink size={14} /></a>
      </Card>

      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-5"><h2 className="m-0 text-base font-black">افزودن {selected.name}</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">شناسه فقط هنگام ثبت دریافت می‌شود و بعداً به‌صورت کامل نمایش داده نخواهد شد.</p></div>
        <label className="grid gap-1.5 text-xs font-bold text-[var(--muted)]">{selected.credentialLabel}<span className="relative block"><Input required minLength={4} maxLength={500} type={showCredential ? "text" : "password"} value={credential} onChange={(event) => setCredential(event.target.value)} placeholder={selected.credentialPlaceholder} dir="ltr" variant="secondary" className={`${adminFieldClass} pl-12`} /><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={showCredential ? "پنهان‌کردن شناسه" : "نمایش شناسه"} onPress={() => setShowCredential((value) => !value)} className="absolute left-2 top-1/2 -translate-y-1/2">{showCredential ? <EyeOff size={15} /> : <Eye size={15} />}</Button></span></label>
        {(selected.id === "ZARINPAL" || selected.id === "ZIBAL") && <div className="mt-4"><AdminCheckbox isSelected={isSandbox} onChange={setIsSandbox} description="فقط برای بررسی اتصال و تراکنش آزمایشی استفاده شود">حالت آزمایشی</AdminCheckbox></div>}
        <Alert status="warning" className="mt-4"><Alert.Description>ثبت شناسه به معنی ذخیره امن تنظیمات است. فعال‌شدن پرداخت واقعی منوط به وجود اتصال فنی request و verify همان ارائه‌دهنده است.</Alert.Description></Alert>
        <Button type="submit" variant="primary" isPending={saving} className="mt-5 min-h-11 w-full gap-2"><Plus size={16} />افزودن درگاه</Button>
      </Card>
    </form>

    <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="border-b border-[var(--border)] p-5"><h2 className="m-0 text-base font-black">درگاه‌های ثبت‌شده</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">برای تغییر شناسه، همان درگاه را دوباره ثبت کنید.</p></div>
      {configs.length ? <div className="divide-y divide-[var(--border)]">{configs.map((config) => <div key={config.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={19} /></span><div className="min-w-0 flex-1"><strong className="block text-sm">{config.displayName}</strong><span className="mt-1 block font-mono text-xs text-[var(--muted)]" dir="ltr">{config.credentialMasked}</span></div>{config.isSandbox && <Chip size="sm" variant="soft" className="text-amber-700"><Chip.Label>آزمایشی</Chip.Label></Chip>}<Button type="button" isIconOnly size="sm" variant="danger-soft" isPending={deleting === config.provider} aria-label={`حذف ${config.displayName}`} onPress={() => void remove(config.provider)}><Trash2 size={15} /></Button></div>)}</div> : <div className="px-5 py-10 text-center text-xs text-[var(--muted)]">هنوز درگاهی ثبت نشده است.</div>}
    </Card>
  </div>;
}
