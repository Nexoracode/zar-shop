"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, toast } from "@heroui/react";
import { FileVideo, ImageIcon, Paperclip, RotateCcw, Send, X } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { TextAreaField } from "@/components/form-field";
import { returnAttachmentAccept, returnAttachmentExtensions, returnLimits } from "@/modules/orders/return-limits";

export type ReturnableItem = { id: string; name: string; returnable: number };

type LineState = { selected: boolean; quantity: number };

export function AccountReturnRequestForm({ orderId, items, deadlineLabel }: { orderId: string; items: ReturnableItem[]; deadlineLabel: string }) {
  const router = useRouter();
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(items.map((item) => [item.id, { selected: false, quantity: 1 }])),
  );
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ items?: string; reason?: string; files?: string }>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCount = useMemo(() => Object.values(lines).filter((line) => line.selected).length, [lines]);

  function setLine(id: string, patch: Partial<LineState>) {
    setLines((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setErrors((current) => ({ ...current, items: undefined }));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    setErrors((current) => ({ ...current, files: undefined }));
    for (const file of incoming) {
      if (!returnAttachmentExtensions[file.type]) {
        setErrors((current) => ({ ...current, files: "فقط عکس (JPG، PNG، WEBP) و ویدئو (MP4، WEBM، MOV) قابل پیوست است." }));
        continue;
      }
      if (file.size > returnLimits.maxAttachmentSize) {
        setErrors((current) => ({ ...current, files: "حجم هر فایل باید کمتر از ۲۵ مگابایت باشد." }));
        continue;
      }
      setFiles((current) => (current.length >= returnLimits.maxAttachments || current.some((existing) => existing.name === file.name && existing.size === file.size)
        ? current
        : [...current, file]));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const chosen = items
      .filter((item) => lines[item.id]?.selected)
      .map((item) => ({ orderItemId: item.id, quantity: Math.min(lines[item.id].quantity, item.returnable) }));
    const next: typeof errors = {};
    if (chosen.length === 0) next.items = "حداقل یک کالا را برای مرجوعی انتخاب کنید.";
    if (reason.trim().length < returnLimits.reasonMin) next.reason = `دلیل مرجوعی باید حداقل ${returnLimits.reasonMin.toLocaleString("fa-IR")} نویسه باشد.`;
    if (Object.keys(next).length) {
      setErrors((current) => ({ ...current, ...next }));
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.set("orderId", orderId);
      form.set("reason", reason.trim());
      form.set("items", JSON.stringify(chosen));
      for (const file of files) form.append("file", file);

      const response = await fetch("/api/account/returns", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
      if (!response.ok || !data?.id) throw new Error(data?.message ?? "ثبت درخواست مرجوعی انجام نشد.");
      toast.success("درخواست مرجوعی ثبت شد", { description: "کارشناسان فروشگاه درخواست شما را بررسی می‌کنند." });
      router.refresh();
    } catch (error) {
      toast.danger("ثبت درخواست مرجوعی انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 sm:p-5">
      <div className="flex items-center gap-2"><RotateCcw size={18} className="text-[var(--brand-primary)]" /><strong className="text-sm">درخواست مرجوعی کالا</strong></div>
      <p className="m-0 mt-1 text-xs leading-6 text-[var(--muted)]">مهلت ثبت درخواست تا {deadlineLabel}. کالاهایی را که می‌خواهید مرجوع کنید انتخاب کنید، دلیل را بنویسید و در صورت نیاز عکس یا فیلم کالا را پیوست کنید.</p>

      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {items.map((item) => {
          const line = lines[item.id];
          return (
            <li key={item.id} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-start gap-3">
                <Checkbox isSelected={line.selected} onChange={() => setLine(item.id, { selected: !line.selected })}>
                  <Checkbox.Content aria-label={`انتخاب ${item.name} برای مرجوعی`} className="cursor-pointer">
                    <Checkbox.Control className="mt-0.5 size-4 rounded border-2 border-[var(--field-border)] bg-[var(--surface)] data-[selected]:border-[var(--brand-primary)] data-[selected]:bg-[var(--brand-primary)]">
                      <Checkbox.Indicator className="grid size-full place-items-center" />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-6">{item.name}</span>
                  <span className="text-[11px] text-[var(--muted)]">قابل مرجوع: {item.returnable.toLocaleString("fa-IR")} عدد</span>
                </div>
                {line.selected && item.returnable > 1 && (
                  <HeroSelectField
                    name={`qty-${item.id}`}
                    ariaLabel={`تعداد مرجوعی ${item.name}`}
                    value={String(line.quantity)}
                    includeEmptyOption={false}
                    options={Array.from({ length: item.returnable }, (_, index) => ({ value: String(index + 1), label: (index + 1).toLocaleString("fa-IR") }))}
                    onValueChange={(value) => setLine(item.id, { quantity: Number(value) })}
                    className="w-24 shrink-0"
                    reserveErrorSpace={false}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {errors.items && <p className="m-0 mt-1.5 text-[11px] font-bold text-[var(--danger)]">{errors.items}</p>}

      <div className="mt-3">
        <TextAreaField
          label="دلیل مرجوعی"
          required
          rows={4}
          maxLength={returnLimits.reasonMax}
          value={reason}
          error={errors.reason}
          placeholder="مثلاً کالا با توضیحات سایت مطابقت ندارد یا هنگام تحویل آسیب‌دیده بود…"
          onChange={(event) => { setReason(event.target.value); setErrors((current) => ({ ...current, reason: undefined })); }}
        />
      </div>

      <div className="mt-1">
        <span className="block text-xs font-bold text-[var(--muted)]">عکس یا فیلم کالا (اختیاری)</span>
        {/* HeroUI has no file-upload primitive; a hidden native input triggered by the styled button is the documented exception. */}
        <input ref={fileInputRef} type="file" multiple hidden accept={returnAttachmentAccept} onChange={(event) => addFiles(event.target.files)} />
        {files.length > 0 && (
          <ul className="m-0 mb-2 mt-2 flex flex-wrap gap-2 p-0">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-[11px]">
                {file.type.startsWith("video/") ? <FileVideo size={13} className="shrink-0 text-[var(--muted)]" /> : <ImageIcon size={13} className="shrink-0 text-[var(--muted)]" />}
                <span className="max-w-40 truncate">{file.name}</span>
                <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف ${file.name}`} onPress={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="min-h-5 min-w-5 text-[var(--muted)] hover:text-[var(--danger)]">
                  <X size={12} />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="ghost" size="sm" onPress={() => fileInputRef.current?.click()} isDisabled={files.length >= returnLimits.maxAttachments} className="mt-2 gap-1.5 text-xs">
          <Paperclip size={14} />افزودن عکس یا فیلم
        </Button>
        <span className="mt-1 block text-[10px] text-[var(--muted)]">حداکثر {returnLimits.maxAttachments.toLocaleString("fa-IR")} فایل، هر کدام تا ۲۵ مگابایت. فرمت‌های JPG، PNG، WEBP، MP4، WEBM، MOV.</span>
        {errors.files && <p className="m-0 mt-1 text-[11px] font-bold text-[var(--danger)]">{errors.files}</p>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11px] text-[var(--muted)]">{selectedCount.toLocaleString("fa-IR")} کالا · {files.length.toLocaleString("fa-IR")} فایل</span>
        <Button type="button" size="sm" isPending={saving} onPress={() => void submit()} className="gap-1.5 bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]">
          {!saving && <Send size={15} />}ثبت درخواست مرجوعی
        </Button>
      </div>
    </div>
  );
}
