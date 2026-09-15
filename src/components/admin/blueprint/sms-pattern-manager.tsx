"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { FileText, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { AdminEmptyState, AdminPanel } from "@/components/admin-ui";
import { smsPatternCategories, type SmsPattern } from "@/modules/communications/sms-patterns";
import { smsPatternFieldLimits } from "@/modules/communications/limits";
import { BpButton, BpInput, BpKicker, BpSelect, BpSwitch, BpTable, BpTag, BpTd, BpTextarea, BpTh } from "./ui";

function statusTone(status: string | null) {
  if (!status) return "neutral" as const;
  const normalized = status.toLowerCase();
  if (normalized.includes("accept") || normalized.includes("approve") || normalized === "active") return "success" as const;
  if (normalized.includes("reject") || normalized.includes("fail")) return "danger" as const;
  return "warning" as const;
}
function statusLabel(status: string | null) {
  if (!status) return "نامشخص";
  const normalized = status.toLowerCase();
  if (normalized.includes("accept") || normalized.includes("approve") || normalized === "active") return "تأییدشده";
  if (normalized.includes("reject")) return "ردشده";
  if (normalized.includes("pending") || normalized.includes("wait")) return "در انتظار تأیید";
  return status;
}
function categoryLabel(category: number | null) {
  return smsPatternCategories.find((item) => item.value === category)?.label ?? "—";
}

export function BlueprintSmsPatternList({ initialPatterns }: { initialPatterns: SmsPattern[] }) {
  const router = useRouter();
  const [patterns, setPatterns] = useState(initialPatterns);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setBusy("refresh");
    try {
      const response = await fetch("/api/admin/sms/patterns");
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "دریافت پترن‌ها انجام نشد.");
      setPatterns(result);
    } catch (error) {
      toast.danger("بروزرسانی انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally { setBusy(null); }
  }

  async function remove(code: string) {
    if (!window.confirm("این پترن برای همیشه از حساب فراز اس‌ام‌اس حذف می‌شود. ادامه می‌دهید؟")) return;
    setBusy(`delete-${code}`);
    try {
      const response = await fetch(`/api/admin/sms/patterns/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.message ?? "حذف پترن انجام نشد."); }
      setPatterns((current) => current.filter((item) => item.code !== code));
      toast.success("پترن حذف شد");
    } catch (error) {
      toast.danger("حذف انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally { setBusy(null); }
  }

  return (
    <AdminPanel>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--bp-row-line)] p-[14px]">
        <p className="bp-muted m-0 text-[12px]">پترن‌های ثبت‌شده در حساب فراز اس‌ام‌اس شما؛ ساخت پترن جدید تا تأیید اپراتور چند دقیقه زمان می‌برد.</p>
        <BpButton type="button" variant="secondary" size="sm" isPending={busy === "refresh"} onClick={() => void refresh()} className="gap-2"><RefreshCw size={14} />بروزرسانی</BpButton>
      </div>
      {patterns.length ? (
        <>
          <div className="md:hidden">
            {patterns.map((item) => (
              <article key={item.code} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><FileText size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[13px]">{item.text || item.code}</strong>
                    <span className="bp-muted block truncate font-mono text-[11px]" dir="ltr">{item.code}</span>
                  </div>
                  <BpTag tone={statusTone(item.status)}>{statusLabel(item.status)}</BpTag>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <BpButton type="button" variant="secondary" onClick={() => router.push(`/admin/settings/notifications/patterns/${encodeURIComponent(item.code)}/edit`)} className="gap-2"><Pencil size={14} />ویرایش</BpButton>
                  <BpButton type="button" variant="danger" isPending={busy === `delete-${item.code}`} onClick={() => void remove(item.code)} className="gap-2"><Trash2 size={14} />حذف</BpButton>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <BpTable ariaLabel="پترن‌های پیامک" minWidth={860}>
              <thead>
                <tr>
                  <BpTh>متن پترن</BpTh>
                  <BpTh>کد</BpTh>
                  <BpTh>دسته</BpTh>
                  <BpTh>متغیرها</BpTh>
                  <BpTh>وضعیت</BpTh>
                  <BpTh className="text-center">عملیات</BpTh>
                </tr>
              </thead>
              <tbody>
                {patterns.map((item) => (
                  <tr key={item.code}>
                    <BpTd className="max-w-72 truncate font-bold">{item.text}</BpTd>
                    <BpTd className="bp-muted font-mono" dir="ltr">{item.code}</BpTd>
                    <BpTd className="bp-muted">{categoryLabel(item.category)}</BpTd>
                    <BpTd className="bp-muted font-mono" dir="ltr">{item.vars.map((variable) => variable.var).join(", ") || "—"}</BpTd>
                    <BpTd><BpTag tone={statusTone(item.status)}>{statusLabel(item.status)}</BpTag></BpTd>
                    <BpTd className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <BpButton type="button" variant="ghost" isIconOnly size="sm" aria-label={`ویرایش پترن ${item.code}`} onClick={() => router.push(`/admin/settings/notifications/patterns/${encodeURIComponent(item.code)}/edit`)}><Pencil size={15} strokeWidth={1.5} /></BpButton>
                        <BpButton type="button" variant="ghost" className="bp-btn-danger-icon" isIconOnly size="sm" isPending={busy === `delete-${item.code}`} aria-label={`حذف پترن ${item.code}`} onClick={() => void remove(item.code)}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                      </div>
                    </BpTd>
                  </tr>
                ))}
              </tbody>
            </BpTable>
          </div>
        </>
      ) : <AdminEmptyState title="پترنی ثبت نشده" description="هنوز هیچ پترنی در حساب فراز اس‌ام‌اس ثبت نشده است." />}
    </AdminPanel>
  );
}

type PatternVariable = { var: string; length: string; type: "string" | "int" };
function emptyVariable(): PatternVariable { return { var: "", length: "20", type: "string" }; }

export function BlueprintSmsPatternForm({ pattern }: { pattern?: SmsPattern }) {
  const router = useRouter();
  const isEdit = Boolean(pattern);
  const [text, setText] = useState(pattern?.text ?? "");
  const [description, setDescription] = useState(pattern?.description ?? "");
  const [website, setWebsite] = useState(pattern?.website ?? "");
  const [shared, setShared] = useState(pattern?.shared ?? false);
  const [category, setCategory] = useState(String(pattern?.category ?? smsPatternCategories[0].value));
  const [vars, setVars] = useState<PatternVariable[]>(pattern?.vars.length ? pattern.vars.map((item) => ({ var: item.var, length: String(item.length || 20), type: item.type === "int" ? "int" : "string" })) : [emptyVariable()]);
  const [busy, setBusy] = useState(false);

  function updateVariable(index: number, patch: Partial<PatternVariable>) {
    setVars((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const body = { text, description: description || undefined, shared, website, category: Number(category), vars: vars.filter((item) => item.var.trim()).map((item) => ({ var: item.var.trim(), length: Number(item.length) || 20, type: item.type })) };
      const response = await fetch(isEdit ? `/api/admin/sms/patterns/${encodeURIComponent(pattern!.code)}` : "/api/admin/sms/patterns", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره پترن انجام نشد.");
      toast.success(isEdit ? "پترن ویرایش شد" : "پترن ثبت شد", { description: isEdit ? undefined : "تا تأیید اپراتور، پترن قابل استفاده برای ارسال نخواهد بود." });
      router.push("/admin/settings/notifications/patterns");
      router.refresh();
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>محتوای پترن</BpKicker>
        <div className="mt-3 grid gap-3">
          <BpTextarea label="متن پترن" hint="جای هر متغیر را با %نام_متغیر% مشخص کنید، مثلا: کد تأیید شما: %otp%" required rows={3} maxLength={smsPatternFieldLimits.text} value={text} onChange={(event) => setText(event.target.value)} />
          <BpTextarea label="توضیحات" hint="فقط برای شناسایی این پترن در پنل شماست و برای گیرنده ارسال نمی‌شود" rows={2} maxLength={smsPatternFieldLimits.description} value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="دامنه وب‌سایت" hint="دامنه فروشگاه، بدون https و www" required dir="ltr" maxLength={smsPatternFieldLimits.website} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="example.com" />
            {!isEdit && (
              <BpSelect label="دسته پترن" required value={category} onChange={(event) => setCategory(event.target.value)} options={smsPatternCategories.map((item) => ({ value: String(item.value), label: item.label }))} />
            )}
          </div>
          <BpSwitch isSelected={shared} onChange={setShared}>اشتراک‌گذاری پترن با سایر کاربران فراز اس‌ام‌اس</BpSwitch>
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <div className="flex items-center justify-between gap-3">
          <BpKicker>متغیرها</BpKicker>
          <BpButton type="button" variant="secondary" size="sm" onClick={() => setVars((current) => [...current, emptyVariable()])} className="gap-2"><Plus size={14} />افزودن متغیر</BpButton>
        </div>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">برای استفاده به‌عنوان پترن کد تأیید (OTP) این فروشگاه، دقیقاً دو متغیر با نام‌های <bdi dir="ltr" className="font-mono">name</bdi> و <bdi dir="ltr" className="font-mono">otp</bdi> بسازید.</p>
        <div className="mt-3 grid gap-2">
          {vars.map((variable, index) => (
            <div key={index} className="grid grid-cols-2 items-end gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5 sm:grid-cols-[1fr_100px_120px_auto]">
              <BpInput label={index === 0 ? "نام متغیر" : undefined} required dir="ltr" maxLength={smsPatternFieldLimits.variableName} value={variable.var} onChange={(event) => updateVariable(index, { var: event.target.value })} placeholder="otp" reserveMessage={false} />
              <BpInput label={index === 0 ? "حداکثر طول" : undefined} required type="number" min={1} max={500} dir="ltr" value={variable.length} onChange={(event) => updateVariable(index, { length: event.target.value })} reserveMessage={false} />
              <BpSelect label={index === 0 ? "نوع" : undefined} value={variable.type} onChange={(event) => updateVariable(index, { type: event.target.value as "string" | "int" })} options={[{ value: "string", label: "متن" }, { value: "int", label: "عدد" }]} reserveMessage={false} />
              <BpButton type="button" variant="ghost" isIconOnly size="sm" aria-label="حذف این متغیر" disabled={vars.length === 1} onClick={() => setVars((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></BpButton>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-2">
        <BpButton type="submit" variant="primary" isPending={busy}>{isEdit ? "ذخیره تغییرات" : "ثبت پترن"}</BpButton>
        <BpButton type="button" variant="secondary" onClick={() => router.push("/admin/settings/notifications/patterns")}>انصراف</BpButton>
      </div>
    </form>
  );
}
