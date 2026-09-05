"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { AlertTriangle, ExternalLink, Eye, EyeOff, MessageSquareText, Power, ShieldCheck, Trash2 } from "lucide-react";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { AdminEmptyState, AdminPanel } from "@/components/admin-ui";
import { smsProviders, type SmsProviderId } from "@/modules/communications/sms-providers";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import { smsProviderFieldLimits } from "@/modules/communications/limits";
import { BpButton, BpInput, BpKicker, BpTable, BpTag, BpTd, BpTh } from "./ui";

function statusTone(item: PublicSmsProviderConfig) {
  return item.isActive ? "success" : item.sendSupported ? "neutral" : "warning";
}
function statusLabel(item: PublicSmsProviderConfig) {
  return item.isActive ? "فعال" : item.sendSupported ? "غیرفعال" : "نیازمند قرارداد API";
}

export function BlueprintSmsProviderManager({ mode, initialConfigs }: { mode: "list" | "form"; initialConfigs: PublicSmsProviderConfig[] }) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [selectedId, setSelectedId] = useState<SmsProviderId>("FARAZ_SMS");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const selected = useMemo(() => smsProviders.find((item) => item.id === selectedId)!, [selectedId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    try {
      const body = selectedId === "FARAZ_SMS" ? { provider: selectedId, apiKey, senderNumber } : { provider: selectedId, username, password, senderNumber };
      const response = await fetch("/api/admin/sms/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "پیکربندی ذخیره نشد.");
      toast.success(`${selected.name} ذخیره شد`);
      router.push("/admin/settings/notifications/providers");
      router.refresh();
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setBusy(null);
    }
  }

  async function mutate(provider: SmsProviderId, method: "PATCH" | "DELETE") {
    setBusy(`${method}-${provider}`);
    try {
      const response = await fetch(method === "DELETE" ? `/api/admin/sms/providers?provider=${provider}` : "/api/admin/sms/providers", { method, headers: { "Content-Type": "application/json" }, body: method === "PATCH" ? JSON.stringify({ provider }) : undefined });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "عملیات انجام نشد.");
      setConfigs(result);
      toast.success(method === "PATCH" ? "ارائه‌دهنده فعال شد" : "پیکربندی حذف شد");
    } catch (error) {
      toast.danger("عملیات انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setBusy(null);
    }
  }

  if (mode === "list") {
    return (
      <AdminPanel>
        {configs.length ? (
          <>
            <div className="md:hidden">
              {configs.map((item) => (
                <article key={item.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><MessageSquareText size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px]">{item.displayName}</strong>
                      <span className="bp-muted block truncate font-mono text-[11px]" dir="ltr">{item.senderNumber}</span>
                    </div>
                    <BpTag tone={statusTone(item)}>{statusLabel(item)}</BpTag>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <BpButton type="button" variant="secondary" isPending={busy === `PATCH-${item.provider}`} disabled={!item.sendSupported || item.isActive} onClick={() => void mutate(item.provider, "PATCH")} className="gap-2"><Power size={14} />فعال‌سازی</BpButton>
                    <BpButton type="button" variant="danger" isPending={busy === `DELETE-${item.provider}`} onClick={() => void mutate(item.provider, "DELETE")} className="gap-2"><Trash2 size={14} />حذف</BpButton>
                  </div>
                </article>
              ))}
            </div>

            <AdminBulkEditor
              entity="smsProviders"
              entityLabel="ارائه‌دهنده"
              ids={configs.map((item) => item.id)}
              actions={[{ value: "delete", label: "حذف ارائه‌دهندگان انتخاب‌شده", confirmation: { title: "حذف گروهی ارائه‌دهندگان پیامک", description: "اعتبارنامه‌های رمزنگاری‌شده و تنظیمات اتصال ارائه‌دهندگان انتخاب‌شده حذف خواهند شد.", confirmLabel: "حذف ارائه‌دهندگان" } }]}
              onCompleted={({ ids }) => setConfigs((current) => current.filter((item) => !ids.includes(item.id)))}
            >
              <BpTable ariaLabel="ارائه‌دهندگان پیامک" minWidth={780}>
                <thead>
                  <tr>
                    <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh>ارائه‌دهنده</BpTh>
                    <BpTh>شناسه</BpTh>
                    <BpTh>سرشماره</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh className="text-center">عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((item) => (
                    <tr key={item.id}>
                      <BpTd className="w-10 text-center"><AdminBulkCheckbox id={item.id} label={`انتخاب ارائه‌دهنده ${item.displayName}`} /></BpTd>
                      <BpTd className="font-bold">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><MessageSquareText size={15} /></span>
                          <span className="truncate">{item.displayName}</span>
                        </span>
                      </BpTd>
                      <BpTd className="bp-muted font-mono" dir="ltr">{item.credentialMasked}</BpTd>
                      <BpTd className="bp-muted font-mono" dir="ltr">{item.senderNumber}</BpTd>
                      <BpTd><BpTag tone={statusTone(item)}>{statusLabel(item)}</BpTag></BpTd>
                      <BpTd className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <BpButton type="button" variant="ghost" isIconOnly size="sm" disabled={!item.sendSupported || item.isActive} isPending={busy === `PATCH-${item.provider}`} aria-label={`فعال‌سازی ${item.displayName}`} onClick={() => void mutate(item.provider, "PATCH")}><Power size={14} /></BpButton>
                          <BpButton type="button" variant="danger" isIconOnly size="sm" isPending={busy === `DELETE-${item.provider}`} aria-label={`حذف ${item.displayName}`} onClick={() => void mutate(item.provider, "DELETE")}><Trash2 size={14} /></BpButton>
                        </div>
                      </BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </AdminBulkEditor>
          </>
        ) : <AdminEmptyState title="ارائه‌دهنده‌ای پیکربندی نشده" description="هنوز هیچ ارائه‌دهنده پیامکی برای فروشگاه ثبت نشده است." />}
      </AdminPanel>
    );
  }

  return (
    <div className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>ارائه‌دهنده‌های پیشنهادی</BpKicker>
        <div className="mt-3 flex flex-wrap justify-start gap-2">
          {smsProviders.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`flex min-h-16 w-full items-center gap-3 border p-3 text-right sm:w-56 ${isSelected ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] bg-[var(--bp-bg)]"}`}
              >
                <MessageSquareText size={18} className={isSelected ? "text-[var(--bp-accent)]" : "bp-muted"} />
                <span><strong className="block text-[13px]">{item.name}</strong><span className="bp-muted mt-0.5 block text-[10px]">{item.sendSupported ? "ارسال مستقیم API" : "ثبت مشخصات وب‌سرویس"}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={submit} className="grid items-start gap-2 lg:grid-cols-2">
        <section className="bp-frame relative p-[16px]">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><ShieldCheck size={19} /></span>
            <BpKicker>فعال‌سازی {selected.name}</BpKicker>
          </div>
          <ol className="m-0 mt-3 grid list-none gap-2 p-0">
            {selected.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px] leading-6">
                <span className="grid size-6 shrink-0 place-items-center border border-[var(--bp-accent)] text-[11px] font-bold text-[var(--bp-accent)]">{(index + 1).toLocaleString("fa-IR")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a href={selected.docsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[12px] font-bold text-[var(--bp-accent)]">راهنمای رسمی<ExternalLink size={14} /></a>
          {!selected.sendSupported && (
            <div className="mt-3 flex items-start gap-2.5 border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-3 text-[var(--bp-warning)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <p className="m-0 text-[12px] leading-6">به‌دلیل نبود قرارداد عمومی پایدار، این ارائه‌دهنده فعلاً فقط پیکربندی می‌شود و برای ارسال فعال نخواهد شد.</p>
            </div>
          )}
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>اطلاعات اتصال</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px]">اعتبارنامه رمزنگاری می‌شود و بعداً کامل نمایش داده نخواهد شد.</p>
          <div className="mt-3 grid gap-3">
            {selectedId === "FARAZ_SMS" ? (
              <div className="relative">
                <BpInput label="API Key" required type={showSecret ? "text" : "password"} maxLength={smsProviderFieldLimits.apiKey} value={apiKey} onChange={(event) => setApiKey(event.target.value)} dir="ltr" className="pl-11" />
                <button type="button" aria-label="نمایش یا پنهان‌کردن کلید" onClick={() => setShowSecret((value) => !value)} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm absolute left-2 top-[26px]">{showSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            ) : (
              <>
                <BpInput label="نام کاربری" required dir="ltr" maxLength={smsProviderFieldLimits.username} value={username} onChange={(event) => setUsername(event.target.value)} />
                <BpInput label="رمز وب‌سرویس" required type="password" dir="ltr" maxLength={smsProviderFieldLimits.password} value={password} onChange={(event) => setPassword(event.target.value)} />
              </>
            )}
            <BpInput label="سرشماره ارسال" required dir="ltr" maxLength={smsProviderFieldLimits.senderNumber} value={senderNumber} onChange={(event) => setSenderNumber(event.target.value)} placeholder="+983000505" />
            <BpButton type="submit" variant="primary" fullWidth isPending={busy === "save"}>ذخیره پیکربندی</BpButton>
          </div>
        </section>
      </form>
    </div>
  );
}
