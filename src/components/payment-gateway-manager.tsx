"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Input, toast } from "@heroui/react";
import { CheckCircle2, CreditCard, ExternalLink, Eye, EyeOff, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { adminFieldClass } from "@/components/admin-ui";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer, TruncatedTextTooltip } from "@/components/hero";
import { gatewayProviders, type GatewayProviderId } from "@/modules/payments/gateway-providers";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";

export function PaymentGatewayManager({ mode, initialConfigs }: { mode: "list" | "form"; initialConfigs: PublicGatewayConfig[] }) {
  const router = useRouter();
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
      router.push("/admin/settings/payment-gateways");
      router.refresh();
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

  if (mode === "list") return <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" dir="rtl">
    <div className="border-b border-[var(--border)] p-5"><h2 className="m-0 text-base font-black">درگاه‌های ثبت‌شده</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">برای تغییر شناسه، درگاه موردنظر را از صفحه افزودن دوباره ثبت کنید.</p></div>
    {configs.length ? <Table><TableScrollContainer><TableContent aria-label="فهرست درگاه‌های پرداخت" className="w-full min-w-[620px]"><TableHeader>{["درگاه", "شناسه اتصال", "محیط", "عملیات"].map((head, index) => <TableColumn id={head} key={head} isRowHeader={index === 0} className="bg-[var(--surface-secondary)] px-5 py-3 text-right text-[11px] font-bold text-[var(--muted)]">{head}</TableColumn>)}</TableHeader><TableBody>{configs.map((config) => <TableRow id={config.id} key={config.id} className="transition hover:bg-[var(--surface-secondary)]/70"><TableCell className="w-56 max-w-56 px-5 py-3 align-middle"><span className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={17} /></span><TruncatedTextTooltip text={config.displayName} className="max-w-36 text-sm font-bold" /></span></TableCell><TableCell className="px-5 py-3 align-middle"><span className="block font-mono text-xs text-[var(--muted)]" dir="ltr">{config.credentialMasked}</span></TableCell><TableCell className="px-5 py-3 align-middle"><Chip size="sm" variant="soft" className={config.isSandbox ? "text-amber-700" : "text-emerald-700"}><Chip.Label>{config.isSandbox ? "آزمایشی" : "اصلی"}</Chip.Label></Chip></TableCell><TableCell className="px-5 py-3 align-middle"><Button type="button" isIconOnly size="sm" variant="danger-soft" isPending={deleting === config.provider} aria-label={`حذف ${config.displayName}`} onPress={() => void remove(config.provider)}><Trash2 size={15} /></Button></TableCell></TableRow>)}</TableBody></TableContent></TableScrollContainer></Table> : <div className="px-5 py-10 text-center text-xs text-[var(--muted)]">هنوز درگاهی ثبت نشده است.</div>}
  </Card>;

  return <div className="grid gap-5" dir="rtl">
    <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4"><h2 className="m-0 text-base font-black">درگاه‌های پیشنهادی</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">درگاه موردنظر را انتخاب کنید تا راهنمای دریافت شناسه آن نمایش داده شود.</p></div>
      <div className="flex flex-wrap items-stretch justify-start gap-2">{gatewayProviders.map((provider) => {
        const configured = configs.some((config) => config.provider === provider.id);
        return <Button key={provider.id} type="button" variant={selectedId === provider.id ? "primary" : "secondary"} onPress={() => { setSelectedId(provider.id); setCredential(""); setIsSandbox(false); }} className="h-auto min-h-20 w-full justify-start gap-3 px-4 py-3 text-right sm:w-52">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${selectedId === provider.id ? "bg-white/15" : "bg-[var(--accent)]/10 text-[var(--accent)]"}`}><CreditCard size={19} /></span>
          <span className="min-w-0"><strong className="block text-sm">{provider.name}</strong><span className="mt-1 block text-[10px] opacity-75">{configured ? "قبلاً ثبت شده" : "قابل افزودن"}</span></span>
        </Button>;
      })}</div>
    </Card>

    <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-2">
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><ShieldCheck size={20} /></span><div><h2 className="m-0 text-base font-black">فعال‌سازی {selected.name}</h2><p className="m-0 mt-1 text-xs text-[var(--muted)]">ابتدا شناسه اتصال را از پنل رسمی درگاه دریافت کنید.</p></div></div>
        <ol className="m-0 grid list-none gap-3 p-0">{selected.steps.map((step, index) => <li key={step} className="flex items-start gap-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-xs leading-6"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/10 font-black text-[var(--accent)]">{(index + 1).toLocaleString("fa-IR")}</span><span>{step}</span></li>)}</ol>
        <a href={selected.signupUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--accent)]">ورود به سایت رسمی {selected.name}<ExternalLink size={14} /></a>
      </Card>

      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3"><div className="min-w-0"><h2 className="m-0 text-base font-black">افزودن {selected.name}</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">شناسه فقط هنگام ثبت دریافت می‌شود و بعداً به‌صورت کامل نمایش داده نخواهد شد.</p></div><div className="mr-auto"><AdminSectionHelp title={`افزودن ${selected.name}`} summary="شناسه اتصال درگاه به‌صورت رمزنگاری‌شده ذخیره و پس از ثبت فقط ماسک‌شده نمایش داده می‌شود." blocks={[{ title: "ثبت شناسه", items: ["شناسه را فقط از پنل رسمی ارائه‌دهنده دریافت کنید.", "مقدار را بدون فاصله اضافی وارد کنید.", "برای جایگزینی شناسه قبلی، همان درگاه را دوباره ثبت کنید."] }, { title: "حالت آزمایشی", description: "Sandbox فقط برای تست request، callback و verify است. پیش از انتشار، تنظیم اصلی پذیرنده را ثبت کنید." }, { title: "فعال‌شدن پرداخت", tone: "important", description: "ذخیره شناسه به‌تنهایی کافی نیست؛ اتصال فنی request و verify همان ارائه‌دهنده باید در سامانه پشتیبانی و پرداخت آنلاین نیز در تنظیمات فعال باشد." }]} /></div></div>
        <label className="grid gap-1.5 text-xs font-bold text-[var(--muted)]">{selected.credentialLabel}<span className="relative block"><Input required minLength={4} maxLength={500} type={showCredential ? "text" : "password"} value={credential} onChange={(event) => setCredential(event.target.value)} placeholder={selected.credentialPlaceholder} dir="ltr" variant="secondary" className={`${adminFieldClass} pl-12`} /><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={showCredential ? "پنهان‌کردن شناسه" : "نمایش شناسه"} onPress={() => setShowCredential((value) => !value)} className="absolute left-2 top-1/2 -translate-y-1/2">{showCredential ? <EyeOff size={15} /> : <Eye size={15} />}</Button></span></label>
        {(selected.id === "ZARINPAL" || selected.id === "ZIBAL") && <div className="mt-4"><AdminCheckbox isSelected={isSandbox} onChange={setIsSandbox} description="فقط برای بررسی اتصال و تراکنش آزمایشی استفاده شود">حالت آزمایشی</AdminCheckbox></div>}
        <Button type="submit" variant="primary" isPending={saving} className="mt-5 min-h-11 w-full gap-2"><Plus size={16} />افزودن درگاه</Button>
      </Card>
    </form>

  </div>;
}
