"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Check, CheckCircle2, Copy, CreditCard, ExternalLink, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { AdminActiveToggle } from "@/components/admin-active-toggle";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminGenericBulkEditButton } from "@/components/admin-generic-bulk-edit";
import { AdminEmptyState, AdminPanel } from "@/components/admin-ui";
import { gatewayProviders, type GatewayProviderId } from "@/modules/payments/gateway-providers";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";
import { gatewayFieldLimits } from "@/modules/payments/limits";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpTable, BpTag, BpTd, BpTh } from "./ui";

const PAYMENT_GATEWAYS_TABLE_ID = "paymentGateways";

const paymentGatewayColumns = [
  { id: "gateway", label: "درگاه" },
  { id: "credential", label: "شناسه اتصال" },
  { id: "environment", label: "محیط" },
  { id: "status", label: "وضعیت" },
];

export function BlueprintPaymentGatewayManager({ mode, initialConfigs, appUrl, onSaved, initialHiddenColumns = [] }: { mode: "list" | "form"; initialConfigs: PublicGatewayConfig[]; appUrl?: string; onSaved?: () => void; initialHiddenColumns?: string[] }) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  // The server list is the source of truth once a mutation settles and `router.refresh()` brings
  // a fresh copy (e.g. after the bulk-edit modal's own delete); this render-time sync (not an
  // effect) picks it up without an extra render pass.
  const [prevInitialConfigs, setPrevInitialConfigs] = useState(initialConfigs);
  if (initialConfigs !== prevInitialConfigs) {
    setPrevInitialConfigs(initialConfigs);
    setConfigs(initialConfigs);
  }
  const [selectedId, setSelectedId] = useState<GatewayProviderId>("ZARINPAL");
  const [credential, setCredential] = useState("");
  const [isSandbox, setIsSandbox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<GatewayProviderId | null>(null);
  const [callbackCopied, setCallbackCopied] = useState(false);
  const selected = useMemo(() => gatewayProviders.find((provider) => provider.id === selectedId)!, [selectedId]);
  const callbackUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/api/payment/callback` : null;

  async function copyCallbackUrl() {
    if (!callbackUrl) return;
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCallbackCopied(true);
      toast.success("نشانی Callback کپی شد");
      setTimeout(() => setCallbackCopied(false), 2000);
    } catch {
      toast.danger("کپی انجام نشد؛ نشانی را دستی انتخاب کنید.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payment-gateways", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: selectedId, credential, isSandbox }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت درگاه انجام نشد.");
      setConfigs(result as PublicGatewayConfig[]);
      setCredential("");
      toast.success(`${selected.name} ثبت شد`, { description: "اطلاعات اتصال به‌صورت رمزنگاری‌شده ذخیره شد." });
      if (onSaved) { onSaved(); return; }
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
                    <div className="flex shrink-0 items-center gap-1">
                      <BpTag tone={config.isActive ? "success" : "neutral"}>{config.isActive ? "فعال" : "غیرفعال"}</BpTag>
                      <BpTag tone={config.isSandbox ? "warning" : "success"}>{config.isSandbox ? "آزمایشی" : "اصلی"}</BpTag>
                      <AdminActiveToggle entity="paymentGateways" entityLabel="درگاه" id={config.id} name={config.displayName} isActive={config.isActive} />
                    </div>
                  </div>
                  <BpButton type="button" variant="danger" fullWidth isPending={deleting === config.provider} onClick={() => void remove(config.provider)} className="mt-3 gap-2"><Trash2 size={14} />حذف درگاه</BpButton>
                </article>
              ))}
            </div>

            <AdminColumnVisibility tableId={PAYMENT_GATEWAYS_TABLE_ID} columns={paymentGatewayColumns} initialHidden={initialHiddenColumns}>
              <AdminBulkEditor
                entity="paymentGateways"
                entityLabel="درگاه"
                ids={configs.map((config) => config.id)}
                actions={[]}
                beforeSelectAll={<AdminColumnSettingsButton />}
                extraAction={<AdminGenericBulkEditButton entity="paymentGateways" entityLabel="درگاه" changeTypes={[{ value: "active", label: "وضعیت", options: [{ value: "active:on", label: "فعال‌کردن" }, { value: "active:off", label: "غیرفعال‌کردن" }] }, { value: "delete", label: "حذف درگاه‌های انتخاب‌شده", confirmation: { title: "حذف گروهی درگاه‌ها", description: "اطلاعات اتصال رمزنگاری‌شده درگاه‌های انتخاب‌شده حذف می‌شود و پرداخت از طریق آن‌ها دیگر ممکن نخواهد بود.", confirmLabel: "حذف درگاه‌ها" } }]} />}
              >
                <BpTable ariaLabel="فهرست درگاه‌های پرداخت" minWidth={680}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <AdminColumn id="gateway"><BpTh>درگاه</BpTh></AdminColumn>
                      <AdminColumn id="credential"><BpTh>شناسه اتصال</BpTh></AdminColumn>
                      <AdminColumn id="environment"><BpTh>محیط</BpTh></AdminColumn>
                      <AdminColumn id="status"><BpTh>وضعیت</BpTh></AdminColumn>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((config) => (
                      <tr key={config.id}>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={config.id} label={`انتخاب درگاه ${config.displayName}`} /></BpTd>
                        <AdminColumn id="gateway">
                          <BpTd className="font-bold">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="grid size-8 shrink-0 place-items-center border border-[var(--bp-success)] bg-[var(--bp-success-bg)] text-[var(--bp-success)]"><CheckCircle2 size={15} /></span>
                              <span className="truncate">{config.displayName}</span>
                            </span>
                          </BpTd>
                        </AdminColumn>
                        <AdminColumn id="credential"><BpTd className="bp-muted font-mono" dir="ltr">{config.credentialMasked}</BpTd></AdminColumn>
                        <AdminColumn id="environment"><BpTd><BpTag tone={config.isSandbox ? "warning" : "success"}>{config.isSandbox ? "آزمایشی" : "اصلی"}</BpTag></BpTd></AdminColumn>
                        <AdminColumn id="status"><BpTd><BpTag tone={config.isActive ? "success" : "neutral"}>{config.isActive ? "فعال" : "غیرفعال"}</BpTag></BpTd></AdminColumn>
                        <BpTd className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <AdminActiveToggle entity="paymentGateways" entityLabel="درگاه" id={config.id} name={config.displayName} isActive={config.isActive} />
                            <BpButton type="button" variant="ghost" className="bp-btn-danger-icon" isIconOnly size="sm" isPending={deleting === config.provider} title="حذف" aria-label={`حذف ${config.displayName}`} onClick={() => void remove(config.provider)}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                          </div>
                        </BpTd>
                      </tr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </AdminColumnVisibility>
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
          <BpInput
            label={selected.credentialLabel}
            secret
            required
            minLength={4}
            maxLength={gatewayFieldLimits.credential}
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            placeholder={selected.credentialPlaceholder}
            dir="ltr"
            wrapperClassName="mt-3"
          />
          {callbackUrl && (
            <div className="mt-3">
              <span className="block text-[12px] font-bold">نشانی Callback</span>
              <p className="bp-muted m-0 mt-1 text-[11px] leading-5">این نشانی را هنگام ساخت درگاه در پنل {selected.name} به‌عنوان آدرس بازگشت ثبت کنید.</p>
              <div className="mt-1.5 flex min-w-0 items-center gap-2">
                <span dir="ltr" className="min-w-0 flex-1 truncate border border-[var(--bp-divider)] bg-[var(--bp-bg)] px-3 py-2 text-[11px] text-[var(--bp-muted)]">{callbackUrl}</span>
                <BpButton type="button" variant="ghost" size="sm" onClick={() => void copyCallbackUrl()} className="shrink-0 gap-1.5">
                  {callbackCopied ? <Check size={14} /> : <Copy size={14} />}
                  کپی
                </BpButton>
              </div>
            </div>
          )}
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
