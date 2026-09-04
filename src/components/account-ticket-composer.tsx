"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@heroui/react";
import { Headset, Paperclip, Send, X } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { TextAreaField } from "@/components/form-field";
import { ticketFieldLimits, TICKET_MAX_ATTACHMENTS } from "@/modules/tickets/limits";

type Category = { id: string; name: string };
type Product = { id: string; name: string };

export function NewTicketComposer({ product, categories }: { product: Product | null; categories: Category[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<{ categoryId?: string; body?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)].slice(0, TICKET_MAX_ATTACHMENTS));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const found: { categoryId?: string; body?: string } = {};
    if (!product && !categoryId) found.categoryId = "موضوع تیکت را انتخاب کنید.";
    if (!body.trim() && files.length === 0) found.body = "متن پیام یا فایلی را وارد کنید.";
    if (Object.keys(found).length) {
      setError(found);
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      if (product) form.set("productId", product.id);
      if (categoryId) form.set("categoryId", categoryId);
      form.set("body", body.trim());
      for (const file of files) form.append("file", file);

      const response = await fetch("/api/account/tickets", { method: "POST", body: form });
      const data = await response.json().catch(() => null) as { id?: string; message?: string } | null;
      if (!response.ok || !data?.id) throw new Error(data?.message ?? "ثبت تیکت انجام نشد.");
      toast.success("تیکت ثبت شد.");
      router.push(`/account/tickets/${data.id}`);
      router.refresh();
    } catch (reason) {
      toast.danger("ثبت تیکت انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" dir="rtl">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Headset size={19} className="text-[var(--brand-primary)]" />
        <div>
          <h1 className="m-0 text-base font-bold">تیکت جدید</h1>
          {product && <p className="m-0 mt-1 text-xs text-[var(--muted)]">دربارهٔ «{product.name}»</p>}
        </div>
      </div>

      <div className="grid gap-2 p-5">
        {!product && (
          <HeroSelectField
            name="categoryId"
            label="موضوع تیکت"
            required
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            value={categoryId}
            onValueChange={(value) => { setCategoryId(value); setError((current) => (current ? { ...current, categoryId: undefined } : current)); }}
            error={error?.categoryId}
            reserveErrorSpace
          />
        )}

        <TextAreaField
          label="پیام شما"
          required
          rows={5}
          maxLength={ticketFieldLimits.message}
          value={body}
          error={error?.body}
          placeholder="سؤال یا مشکل خود را توضیح دهید…"
          onChange={(event) => { setBody(event.target.value); setError((current) => (current ? { ...current, body: undefined } : current)); }}
        />

        <div>
          {/* HeroUI has no file-upload primitive; a hidden native input triggered by the styled button is the documented exception. */}
          <input ref={fileInputRef} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => addFiles(event.target.files)} />
          {files.length > 0 && (
            <ul className="m-0 mb-2 flex flex-wrap gap-2 p-0">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-[11px]">
                  <span className="max-w-40 truncate">{file.name}</span>
                  <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف ${file.name}`} onPress={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="min-h-5 min-w-5 text-[var(--muted)] hover:text-[var(--danger)]">
                    <X size={12} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-start gap-2">
            <Button type="button" variant="ghost" size="sm" onPress={() => fileInputRef.current?.click()} isDisabled={files.length >= TICKET_MAX_ATTACHMENTS} className="gap-1.5 text-xs">
              <Paperclip size={15} />پیوست فایل
            </Button>
            <Button type="button" size="sm" isPending={saving} onPress={() => void submit()} className="gap-1.5 bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]">
              {!saving && <Send size={15} />}ارسال تیکت
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
