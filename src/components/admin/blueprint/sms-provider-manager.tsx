"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, MessageSquareText, Power, ShieldCheck, SquarePen, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminGenericBulkEditButton } from "@/components/admin-generic-bulk-edit";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { AdminEmptyState, AdminPanel } from "@/components/admin-ui";
import { smsProviders, type SmsProviderId } from "@/modules/communications/sms-providers";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import { smsProviderFieldLimits } from "@/modules/communications/limits";
import { BlueprintFarazProviderForm } from "./sms-faraz-provider-form";
import { BpButton, BpInput, BpKicker, BpLinkButton, BpTable, BpTag, BpTd, BpTh } from "./ui";

function statusTone(item: PublicSmsProviderConfig) {
  return item.isActive ? "success" : item.sendSupported ? "neutral" : "warning";
}
function statusLabel(item: PublicSmsProviderConfig) {
  return item.isActive ? "فعال" : item.sendSupported ? "غیرفعال" : "نیازمند قرارداد API";
}

/** The three states a provider can be in, as the header filter keys them. */
function providerStatusKey(item: PublicSmsProviderConfig) {
  return item.isActive ? "active" : item.sendSupported ? "inactive" : "unsupported";
}

const SMS_PROVIDERS_TABLE_ID = "smsProviders";

const smsProviderColumns = [
  { id: "provider", label: "ارائه‌دهنده" },
  { id: "credential", label: "شناسه" },
  { id: "senderNumber", label: "سرشماره" },
  { id: "status", label: "وضعیت" },
];

export function BlueprintSmsProviderManager({ mode, initialConfigs, smsEnabled, storeName = "", onSaved, editingProvider, initialSenderNumber, initialHiddenColumns = [], formId, hideSubmit = false, stacked = false, onPendingChange }: { mode: "list" | "form"; /** Lets a button outside the form (the setup wizard's footer) submit it. */ formId?: string; /** Leaves the form's own submit button out; something else submits it through `formId`. */ hideSubmit?: boolean; /** One column instead of two, for a form set inside a narrow card. */ stacked?: boolean; /** Reports the save starting and ending, so an outside submit button can show its spinner. */ onPendingChange?: (pending: boolean) => void; initialConfigs: PublicSmsProviderConfig[]; smsEnabled?: boolean; /** The store name, so the Faraz form can warn when it is longer than a pattern variable allows. */ storeName?: string; onSaved?: () => void; /** Set when editing an already-configured provider: locks the provider picker and prefills the saved settings. */ editingProvider?: SmsProviderId; initialSenderNumber?: string; initialHiddenColumns?: string[] }) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [statusFilter, setStatusFilter] = useState("");
  const visible = configs.filter((item) => !statusFilter || providerStatusKey(item) === statusFilter);
  // The server list is the source of truth once a mutation settles and `router.refresh()` brings
  // a fresh copy (e.g. after the bulk-edit modal's own delete); this render-time sync (not an
  // effect) picks it up without an extra render pass.
  const [prevInitialConfigs, setPrevInitialConfigs] = useState(initialConfigs);
  if (initialConfigs !== prevInitialConfigs) {
    setPrevInitialConfigs(initialConfigs);
    setConfigs(initialConfigs);
  }
  const [selectedId, setSelectedId] = useState<SmsProviderId>(editingProvider ?? "FARAZ_SMS");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [senderNumber, setSenderNumber] = useState(initialSenderNumber ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<PublicSmsProviderConfig | null>(null);
  const [deleting, setDeleting] = useState<PublicSmsProviderConfig | null>(null);
  const selected = useMemo(() => smsProviders.find((item) => item.id === selectedId)!, [selectedId]);
  const existingFaraz = initialConfigs.find((config) => config.provider === "FARAZ_SMS") ?? null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    onPendingChange?.(true);
    try {
      // Faraz has its own form (BlueprintFarazProviderForm); this submit only serves the others.
      const body = { provider: selectedId, username, password, senderNumber };
      const response = await fetch("/api/admin/sms/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "پیکربندی ذخیره نشد.");
      toast.success(`${selected.name} ذخیره شد`);
      if (onSaved) { onSaved(); return; }
      router.push("/admin/settings/notifications/providers");
      router.refresh();
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setBusy(null);
      onPendingChange?.(false);
    }
  }

  async function mutate(provider: SmsProviderId, method: "PATCH" | "DELETE", isActive = true) {
    setBusy(`${method}-${provider}`);
    try {
      const response = await fetch(method === "DELETE" ? `/api/admin/sms/providers?provider=${provider}` : "/api/admin/sms/providers", { method, headers: { "Content-Type": "application/json" }, body: method === "PATCH" ? JSON.stringify({ provider, isActive }) : undefined });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "عملیات انجام نشد.");
      setConfigs(result);
      toast.success(method === "DELETE" ? "پیکربندی حذف شد" : isActive ? "ارائه‌دهنده فعال شد" : "ارائه‌دهنده غیرفعال شد");
    } catch (error) {
      toast.danger("عملیات انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setBusy(null);
    }
  }

  // Switching the active provider off stops every SMS — including the login OTP — so it goes
  // through a confirmation; switching one on needs none.
  function toggleActive(item: PublicSmsProviderConfig) {
    if (item.isActive) setDeactivating(item);
    else void mutate(item.provider, "PATCH", true);
  }

  async function confirmDeactivate() {
    if (!deactivating) return;
    await mutate(deactivating.provider, "PATCH", false);
    setDeactivating(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    await mutate(deleting.provider, "DELETE");
    setDeleting(null);
  }

  if (mode === "list") {
    return (
      <AdminPanel>
        {configs.length ? (
          <>
            <div className="md:hidden">
              {visible.map((item) => (
                <article key={item.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><MessageSquareText size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px]">{item.displayName}</strong>
                      <span className="bp-muted block truncate font-mono text-[11px]" dir="ltr">{item.senderNumber}</span>
                    </div>
                    <BpTag tone={statusTone(item)}>{statusLabel(item)}</BpTag>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <BpLinkButton href={`/admin/settings/notifications/providers/${item.provider}/edit`} variant="secondary" className="gap-2"><SquarePen size={14} />ویرایش</BpLinkButton>
                    <BpButton type="button" variant="secondary" isPending={busy === `PATCH-${item.provider}`} disabled={!item.sendSupported && !item.isActive} onClick={() => toggleActive(item)} className="gap-2">{item.isActive ? <ToggleRight size={14} className="text-[var(--bp-success)]" /> : <ToggleLeft size={14} className="bp-muted" />}{item.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}</BpButton>
                    <BpButton type="button" variant="danger" isPending={busy === `DELETE-${item.provider}`} onClick={() => setDeleting(item)} className="gap-2"><Trash2 size={14} />حذف</BpButton>
                  </div>
                </article>
              ))}
            </div>

            <AdminColumnVisibility tableId={SMS_PROVIDERS_TABLE_ID} columns={smsProviderColumns} initialHidden={initialHiddenColumns}>
              <AdminBulkEditor
                entity="smsProviders"
                entityLabel="ارائه‌دهنده"
                ids={visible.map((item) => item.id)}
                actions={[]}
                beforeSelectAll={<AdminColumnSettingsButton />}
                extraAction={<AdminGenericBulkEditButton entity="smsProviders" entityLabel="ارائه‌دهنده" changeTypes={[{ value: "delete", label: "حذف ارائه‌دهندگان انتخاب‌شده", confirmation: { title: "حذف گروهی ارائه‌دهندگان پیامک", description: "اعتبارنامه‌های رمزنگاری‌شده و تنظیمات اتصال ارائه‌دهندگان انتخاب‌شده حذف خواهند شد.", confirmLabel: "حذف ارائه‌دهندگان" } }]} />}
              >
                <BpTable ariaLabel="ارائه‌دهندگان پیامک" minWidth={780}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <AdminColumn id="provider"><BpTh>ارائه‌دهنده</BpTh></AdminColumn>
                      <AdminColumn id="credential"><BpTh>شناسه</BpTh></AdminColumn>
                      <AdminColumn id="senderNumber"><BpTh>سرشماره</BpTh></AdminColumn>
                      <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter ariaLabel="فیلتر وضعیت" groups={[{ name: "status", label: "وضعیت", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }, { value: "unsupported", label: "نیازمند قرارداد API" }] }]} /></span></BpTh></AdminColumn>
                      <BpTh>عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <AdminBulkTr key={item.id} id={item.id}>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={item.id} label={`انتخاب ارائه‌دهنده ${item.displayName}`} /></BpTd>
                        <AdminColumn id="provider">
                          <BpTd className="font-bold">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="grid size-8 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><MessageSquareText size={15} /></span>
                              <span className="truncate">{item.displayName}</span>
                            </span>
                          </BpTd>
                        </AdminColumn>
                        <AdminColumn id="credential"><BpTd className="bp-muted font-mono" dir="ltr">{item.credentialMasked}</BpTd></AdminColumn>
                        <AdminColumn id="senderNumber"><BpTd className="bp-muted font-mono" dir="ltr">{item.senderNumber}</BpTd></AdminColumn>
                        <AdminColumn id="status"><BpTd><BpTag tone={statusTone(item)}>{statusLabel(item)}</BpTag></BpTd></AdminColumn>
                        <BpTd>
                          <div className="flex items-center justify-start gap-1">
                            <BpLinkButton href={`/admin/settings/notifications/providers/${item.provider}/edit`} variant="ghost" isIconOnly size="sm" aria-label={`ویرایش ${item.displayName}`}><SquarePen size={15} strokeWidth={1.5} /></BpLinkButton>
                            <BpButton type="button" variant="ghost" isIconOnly size="sm" disabled={!item.sendSupported && !item.isActive} isPending={busy === `PATCH-${item.provider}`} title={item.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"} aria-label={`${item.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"} ${item.displayName}`} onClick={() => toggleActive(item)}>{item.isActive ? <ToggleRight size={15} strokeWidth={1.5} className="text-[var(--bp-success)]" /> : <ToggleLeft size={15} strokeWidth={1.5} className="bp-muted" />}</BpButton>
                            <BpButton type="button" variant="ghost" className="bp-btn-danger-icon" isIconOnly size="sm" isPending={busy === `DELETE-${item.provider}`} aria-label={`حذف ${item.displayName}`} onClick={() => setDeleting(item)}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                          </div>
                        </BpTd>
                      </AdminBulkTr>
                    ))}
                    {!visible.length && <tr><BpTd colSpan={99} className="bp-muted py-8 text-center">چیزی پیدا نشد.</BpTd></tr>}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </AdminColumnVisibility>
          </>
        ) : <AdminEmptyState title="ارائه‌دهنده‌ای پیکربندی نشده" description="هنوز هیچ ارائه‌دهنده پیامکی برای فروشگاه ثبت نشده است." />}
        <DeleteConfirmDialog
          open={Boolean(deleting)}
          title="حذف ارائه‌دهندهٔ پیامک"
          itemName={deleting?.displayName}
          confirmLabel="حذف ارائه‌دهنده"
          description={deleting?.isActive
            ? "اعتبارنامه‌های رمزنگاری‌شده و تنظیمات اتصال حذف می‌شود. این ارائه‌دهنده هم‌اکنون فعال است؛ با حذف آن هیچ پیامکی، از جمله کد یک‌بارمصرف ورود، ارسال نمی‌شود تا ارائه‌دهندهٔ دیگری را فعال کنید."
            : "اعتبارنامه‌های رمزنگاری‌شده و تنظیمات اتصال این ارائه‌دهنده حذف می‌شود."}
          loading={busy === `DELETE-${deleting?.provider}`}
          onClose={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
        <ConfirmDialog
          open={Boolean(deactivating)}
          tone="warning"
          title="غیرفعال‌سازی ارائه‌دهندهٔ پیامک"
          subtitle="هر زمان بخواهید می‌توانید دوباره فعالش کنید."
          itemName={deactivating?.displayName}
          confirmLabel="غیرفعال‌سازی"
          loadingLabel="در حال غیرفعال‌سازی..."
          description="با غیرفعال‌شدن این ارائه‌دهنده هیچ پیامکی، از جمله کد یک‌بارمصرف ورود و ثبت‌نام، ارسال نمی‌شود تا ارائه‌دهنده‌ای را دوباره فعال کنید."
          icon={<Power size={24} strokeWidth={1.7} />}
          confirmIcon={<Power size={15} strokeWidth={1.7} />}
          loading={busy === `PATCH-${deactivating?.provider}`}
          onClose={() => setDeactivating(null)}
          onConfirm={() => void confirmDeactivate()}
        />
      </AdminPanel>
    );
  }

  return (
    <div className="grid gap-2">
      {smsEnabled === false && (
        <div className="bp-frame relative flex items-start gap-3 border-[var(--bp-warning)] p-[14px]">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--bp-warning)]" />
          <div className="min-w-0 text-[12px] leading-6">
            <strong className="block text-[13px]">ارسال پیامک هنوز خاموش است</strong>
            تا کلید «ارسال پیامک فعال باشد» در تنظیمات پیامک و اعلان روشن نشود، هیچ پیامکی (از جمله کد یک‌بارمصرف) ارسال نمی‌شود.
            <Link href="/admin/settings/notifications/preferences" className="mt-1 block font-bold text-[var(--bp-accent)]">رفتن به تنظیمات پیامک و اعلان ←</Link>
          </div>
        </div>
      )}
      <section className="bp-frame relative p-[16px]">
        <BpKicker>{editingProvider ? "ارائه‌دهنده" : "ارائه‌دهنده‌های پیشنهادی"}</BpKicker>
        <div className="mt-3 flex flex-wrap justify-start gap-2">
          {(editingProvider ? smsProviders.filter((item) => item.id === editingProvider) : smsProviders).map((item) => {
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

      {selectedId === "FARAZ_SMS" ? (
        // Keyed by the saved config so a refreshed server copy remounts it with the new values.
        <BlueprintFarazProviderForm key={existingFaraz?.updatedAt ?? "new"} existing={existingFaraz} storeName={storeName} onSaved={onSaved} formId={formId} hideSubmit={hideSubmit} stacked={stacked} onPendingChange={onPendingChange} />
      ) : (
      <form id={formId} onSubmit={submit} className={`grid items-start gap-2 ${stacked ? "" : "lg:grid-cols-2"}`}>
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
            <BpInput label="نام کاربری" required dir="ltr" maxLength={smsProviderFieldLimits.username} value={username} onChange={(event) => setUsername(event.target.value)} />
            <BpInput label="رمز وب‌سرویس" required type="password" dir="ltr" maxLength={smsProviderFieldLimits.password} value={password} onChange={(event) => setPassword(event.target.value)} />
            <BpInput label="سرشماره ارسال" required dir="ltr" maxLength={smsProviderFieldLimits.senderNumber} value={senderNumber} onChange={(event) => setSenderNumber(event.target.value)} placeholder="90008361" />
            {!hideSubmit && <BpButton type="submit" variant="primary" fullWidth isPending={busy === "save"}>ذخیره پیکربندی</BpButton>}
          </div>
        </section>
      </form>
      )}
    </div>
  );
}
