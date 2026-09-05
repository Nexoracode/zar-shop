"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { CheckCircle2, CreditCard, ExternalLink, Eye, EyeOff, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { AdminEmptyState, AdminPanel } from "@/components/admin-ui";
import { gatewayProviders, type GatewayProviderId } from "@/modules/payments/gateway-providers";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";
import { gatewayFieldLimits } from "@/modules/payments/limits";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpTable, BpTag, BpTd, BpTh } from "./ui";

export function BlueprintPaymentGatewayManager({ mode, initialConfigs }: { mode: "list" | "form"; initialConfigs: PublicGatewayConfig[] }) {
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
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payment-gateways", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: selectedId, credential, isSandbox }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت درگاه انجام نشد.");
      setConfigs(result as PublicGatewayConfig[]);
      setCredential("");
      setShowCredential(false);
      toast.success(`${selected.name} ثبت شد`, { description: "اطلاعات اتصال به‌صورت رمزنگاری‌شده ذخیره شد." });
      router.push("/admin/settings/payment-gateways");
      router.refresh();
    } catch (reason) {
      toast.danger("ثبت درگاه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(provider: GatewayProviderId) {
    setDeleting(provider);
    try {
      const response = await fetch(`/api/admin/payment-gateways?provider=${provider}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف درگاه انجام نشد.");
      setConfigs(result as PublicGatewayConfig[]);
      toast.success("درگاه حذف شد");
    } catch (reason) {
      toast.danger("حذف درگاه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setDeleting(null);
    }
  }

  if (mode === "list") {
    return (
      <AdminPanel>
        <div className="border-b border-[var(--bp-divider)] p-4">
          <BpKicker>درگاه‌های ثبت‌شده</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px]">برای تغییر شناسه، درگاه موردنظر را از صفحه افزودن دوباره ثبت کنید.</p>
        </div>
        {configs.length ? (
          <>
            <div className="md:hidden">
              {configs.map((config) => (
                <article key={config.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-success)] bg-[var(--bp-success-bg)] text-[var(--bp-success)]"><CheckCircle2 size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px]">{config.displayName}</strong>
                      <span className="bp-muted block truncate font-mono text-[11px]" dir="ltr">{config.credentialMasked}</span>
                    </div>
                    <BpTag tone={config.isSandbox ? "warning" : "success"}>{config.isSandbox ? "آزمایشی" : "اصلی"}</BpTag>
                  </div>
                  <BpButton type="button" variant="danger" fullWidth isPending={deleting === config.provider} onClick={() => void remove(config.provider)} className="mt-3 gap-2"><Trash2 size={14} />حذف درگاه</BpButton>
                </article>
              ))}
            </div>

            <AdminBulkEditor
              entity="paymentGateways"
              entityLabel="درگاه"
              ids={configs.map((config) => config.id)}
              actions={[{ value: "delete", label: "حذف درگاه‌های انتخاب‌شده", confirmation: { title: "حذف گروهی درگاه‌ها", description: "اطلاعات اتصال رمزنگاری‌شده درگاه‌های انتخاب‌شده حذف می‌شود و پرداخت از طریق آن‌ها دیگر ممکن نخواهد بود.", confirmLabel: "حذف درگاه‌ها" } }]}
              onCompleted={({ ids }) => setConfigs((current) => current.filter((item) => !ids.includes(item.id)))}
            >
              <BpTable ariaLabel="فهرست درگاه‌های پرداخت" minWidth={680}>
                <thead>
                  <tr>
                    <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh>درگاه</BpTh>
                    <BpTh>شناسه اتصال</BpTh>
                    <BpTh>محیط</BpTh>
                    <BpTh className="text-center">عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config.id}>
                      <BpTd className="w-10 text-center"><AdminBulkCheckbox id={config.id} label={`انتخاب درگاه ${config.displayName}`} /></BpTd>
                      <BpTd className="font-bold">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center border border-[var(--bp-success)] bg-[var(--bp-success-bg)] text-[var(--bp-success)]"><CheckCircle2 size={15} /></span>
                          <span className="truncate">{config.displayName}</span>
                        </span>
                      </BpTd>
                      <BpTd className="bp-muted font-mono" dir="ltr">{config.credentialMasked}</BpTd>
                      <BpTd><BpTag tone={config.isSandbox ? "warning" : "success"}>{config.isSandbox ? "آزمایشی" : "اصلی"}</BpTag></BpTd>
                      <BpTd className="text-center">
                        <BpButton type="button" variant="danger" isIconOnly size="sm" isPending={deleting === config.provider} aria-label={`حذف ${config.displayName}`} onClick={() => void remove(config.provider)}><Trash2 size={14} /></BpButton>
                      </BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </AdminBulkEditor>
          </>
        ) : <AdminEmptyState title="درگاهی ثبت نشده" description="هنوز هیچ درگاه پرداختی برای فروشگاه ثبت نشده است." />}
      </AdminPanel>
    );
  }

  return (
    <div className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>درگاه‌های پیشنهادی</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px]">درگاه موردنظر را انتخاب کنید تا راهنمای دریافت شناسه آن نمایش داده شود.</p>
        <div className="mt-3 flex flex-wrap items-stretch justify-start gap-2">
          {gatewayProviders.map((provider) => {
            const configured = configs.some((config) => config.provider === provider.id);
            const isSelected = selectedId === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => { setSelectedId(provider.id); setCredential(""); setIsSandbox(false); }}
                className={`flex h-auto min-h-20 w-full items-center gap-3 border p-3 text-right sm:w-52 ${isSelected ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] bg-[var(--bp-bg)]"}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center border ${isSelected ? "border-[var(--bp-accent)] bg-[var(--bp-card)] text-[var(--bp-accent)]" : "border-[var(--bp-divider)] text-[var(--bp-muted)]"}`}><CreditCard size={19} /></span>
                <span className="min-w-0">
                  <strong className="block text-[13px]">{provider.name}</strong>
                  <span className="bp-muted mt-0.5 block text-[10px]">{configured ? "قبلاً ثبت شده" : "قابل افزودن"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={submit} className="grid items-start gap-2 lg:grid-cols-2">
        <section className="bp-frame relative p-[16px]">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><ShieldCheck size={19} /></span>
            <div><BpKicker>فعال‌سازی {selected.name}</BpKicker><p className="bp-muted m-0 mt-1 text-[12px]">ابتدا شناسه اتصال را از پنل رسمی درگاه دریافت کنید.</p></div>
          </div>
          <ol className="m-0 mt-3 grid list-none gap-2 p-0">
            {selected.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px] leading-6">
                <span className="grid size-6 shrink-0 place-items-center border border-[var(--bp-accent)] text-[11px] font-bold text-[var(--bp-accent)]">{(index + 1).toLocaleString("fa-IR")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a href={selected.signupUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[12px] font-bold text-[var(--bp-accent)]">ورود به سایت رسمی {selected.name}<ExternalLink size={14} /></a>
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>افزودن {selected.name}</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px]">شناسه فقط هنگام ثبت دریافت می‌شود و بعداً به‌صورت کامل نمایش داده نخواهد شد.</p>
          <div className="relative mt-3">
            <BpInput
              label={selected.credentialLabel}
              required
              minLength={4}
              maxLength={gatewayFieldLimits.credential}
              type={showCredential ? "text" : "password"}
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              placeholder={selected.credentialPlaceholder}
              dir="ltr"
              className="pl-11"
            />
            <button type="button" aria-label={showCredential ? "پنهان‌کردن شناسه" : "نمایش شناسه"} onClick={() => setShowCredential((value) => !value)} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm absolute left-2 top-[26px]">{showCredential ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
          {(selected.id === "ZARINPAL" || selected.id === "ZIBAL") && (
            <BpCheckbox isSelected={isSandbox} onChange={() => setIsSandbox((value) => !value)} className="mt-1 w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
              <span><strong className="block text-[13px] font-bold">حالت آزمایشی</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">فقط برای بررسی اتصال و تراکنش آزمایشی استفاده شود</span></span>
            </BpCheckbox>
          )}
          <p className="bp-muted m-0 mt-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[11px] leading-6">ذخیره شناسه به‌تنهایی کافی نیست؛ اتصال فنی همان ارائه‌دهنده باید در وضعیت «پرداخت آنلاین» تنظیمات ارسال و پرداخت هم فعال باشد.</p>
          <BpButton type="submit" variant="primary" fullWidth isPending={saving} className="mt-3 gap-2"><Plus size={16} />افزودن درگاه</BpButton>
        </section>
      </form>
    </div>
  );
}
