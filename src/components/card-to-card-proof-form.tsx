"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Card, Spinner, toast } from "@heroui/react";
import { Check, ChevronLeft, FileText, ImagePlus, ReceiptText, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { FormField, TextField, fieldControlProps } from "@/components/form-field";
import { InlineAlert } from "@/components/inline-alert";
import { CARD_NUMBER_LENGTH, detectBankName, formatCardNumber, normalizeCardNumber } from "@/modules/account/bank-card";
import {
  cardToCardLimits,
  cardToCardReceiptAccept,
  cardTransferDetailsSchema,
  normalizeTrackingCode,
  receiptFileProblem,
} from "@/modules/payments/card-to-card-shared";

type Mode = "receipt" | "details";
type Errors = { receipt?: string; sourceCardNumber?: string; trackingCode?: string };

const modes: Array<{ id: Mode; title: string; description: string; icon: typeof ReceiptText }> = [
  { id: "receipt", title: "ارسال رسید پرداخت", description: "تصویر یا اسکرین‌شات رسید بانکی را بارگذاری کنید.", icon: ReceiptText },
  { id: "details", title: "ثبت اطلاعات پرداخت", description: "شماره کارت مبدأ و کد رهگیری را وارد کنید.", icon: FileText },
];

/** Same look as the payment-method rows on the checkout page, so the two choices read as one family. */
const optionClass = (selected: boolean) =>
  `h-auto min-h-0 w-full items-center justify-start gap-2.5 rounded-lg border px-3 py-2.5 text-right ${selected ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-[var(--border)]"}`;

/** A card is shown grouped by four (`6037 9911 …`): sixteen digits plus three spaces. */
const CARD_INPUT_MAX_LENGTH = CARD_NUMBER_LENGTH + Math.ceil(CARD_NUMBER_LENGTH / 4) - 1;

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت` : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("fa-IR")} کیلوبایت`;
}

export function CardToCardProofForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("receipt");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceCard, setSourceCard] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<string | null>(null);

  // The preview is an object URL, which the browser keeps alive until it is told otherwise:
  // the previous one is released whenever the file changes, and the last one on unmount.
  function setReceipt(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setFile(next);
    setPreviewUrl(previewRef.current);
  }
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const sourceBank = detectBankName(sourceCard);
  const clear = (field: keyof Errors) => { setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current)); setFormError(""); };

  function chooseFile(candidate: File | undefined) {
    if (!candidate) return;
    const problem = receiptFileProblem(candidate);
    if (problem) { setErrors((current) => ({ ...current, receipt: problem })); return; }
    setReceipt(candidate);
    clear("receipt");
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  function focusFirst(next: Errors) {
    const target = next.receipt ? pickerRef.current : next.sourceCardNumber ? document.getElementById("cardTransferSourceCard") : document.getElementById("cardTransferTrackingCode");
    requestAnimationFrame(() => target?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError("");
    const body = new FormData();
    if (mode === "receipt") {
      if (!file) {
        const next = { receipt: "تصویر رسید پرداخت را انتخاب کنید." };
        setErrors(next);
        focusFirst(next);
        return;
      }
      body.set("receipt", file);
    } else {
      const parsed = cardTransferDetailsSchema.safeParse({ sourceCardNumber: sourceCard, trackingCode });
      if (!parsed.success) {
        const fields = parsed.error.flatten().fieldErrors;
        const next: Errors = { sourceCardNumber: fields.sourceCardNumber?.[0], trackingCode: fields.trackingCode?.[0] };
        setErrors(next);
        focusFirst(next);
        return;
      }
      body.set("sourceCardNumber", parsed.data.sourceCardNumber);
      body.set("trackingCode", parsed.data.trackingCode);
    }

    setErrors({});
    setPending(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/card-to-card`, { method: "POST", body });
      const result = await response.json().catch(() => null) as { message?: string; issues?: Record<string, string[] | undefined> } | null;
      if (!response.ok) {
        const next: Errors = { sourceCardNumber: result?.issues?.sourceCardNumber?.[0], trackingCode: result?.issues?.trackingCode?.[0] };
        if (next.sourceCardNumber || next.trackingCode) { setErrors(next); focusFirst(next); }
        else setFormError(result?.message ?? "ثبت پرداخت انجام نشد؛ دوباره تلاش کنید.");
        setPending(false);
        return;
      }
      toast.success("پرداخت شما ثبت شد", { description: "پس از بررسی فروشگاه، وضعیت سفارش به‌روزرسانی می‌شود." });
      // The page turns into the "waiting for the store" view once it re-reads the order; keep the button busy until then.
      router.refresh();
    } catch {
      setFormError("ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی و دوباره تلاش کنید.");
      setPending(false);
    }
  }

  return (
    <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Content className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><ReceiptText size={18} /></span>
          <div>
            <h2 className="m-0 text-base font-bold">تأیید پرداخت</h2>
            <p className="mb-0 mt-1 text-xs leading-6 text-[var(--muted)]">پس از واریز، یکی از دو روش زیر را برای اطلاع فروشگاه انتخاب کنید.</p>
          </div>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="روش تأیید پرداخت">
            {modes.map((option) => {
              const selected = mode === option.id;
              const Icon = option.icon;
              return (
                <Button key={option.id} type="button" variant="secondary" aria-pressed={selected} isDisabled={pending} onPress={() => { setMode(option.id); setErrors({}); setFormError(""); }} className={optionClass(selected)}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><Icon size={17} /></span>
                  <span className="min-w-0 flex-1"><strong className="block whitespace-normal text-[13px]">{option.title}</strong><small className="mt-0.5 block whitespace-normal text-[11px] font-normal text-[var(--muted)]">{option.description}</small></span>
                  {selected && <Check size={16} className="shrink-0 text-[var(--brand-primary)]" />}
                </Button>
              );
            })}
          </div>

          <div className="mt-5">
            {mode === "receipt" ? (
              <FormField id="cardTransferReceipt" label="تصویر رسید" required error={errors.receipt} hint={`فرمت JPG، PNG یا WEBP، حداکثر ${(cardToCardLimits.maxReceiptSize / 1024 / 1024).toLocaleString("fa-IR")} مگابایت`}>
                {/* HeroUI has no file-upload primitive; a hidden native input opened by the styled button is the same documented exception the return-request form makes. */}
                <input
                  ref={fileInputRef}
                  {...fieldControlProps("cardTransferReceipt", errors.receipt, true)}
                  type="file"
                  hidden
                  accept={cardToCardReceiptAccept}
                  onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }}
                />
                {file && previewUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/45 p-3">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                      <Image src={previewUrl} alt="پیش‌نمایش رسید پرداخت" fill unoptimized sizes="80px" className="object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px]" dir="ltr">{file.name}</strong>
                      <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{formatFileSize(file.size)}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--success)]"><Check size={13} />آمادهٔ ارسال</span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button ref={pickerRef} type="button" isIconOnly size="sm" variant="ghost" aria-label="تغییر تصویر رسید" isDisabled={pending} onPress={() => fileInputRef.current?.click()} className="size-9 min-h-9 min-w-9 text-[var(--muted)] hover:text-[var(--brand-primary)]"><RefreshCw size={16} /></Button>
                      <Button type="button" isIconOnly size="sm" variant="ghost" aria-label="حذف تصویر رسید" isDisabled={pending} onPress={() => setReceipt(null)} className="size-9 min-h-9 min-w-9 text-[var(--muted)] hover:text-[var(--danger)]"><Trash2 size={16} /></Button>
                    </div>
                  </div>
                ) : (
                  <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
                    <Button
                      ref={pickerRef}
                      type="button"
                      variant="secondary"
                      isDisabled={pending}
                      onPress={() => fileInputRef.current?.click()}
                      aria-describedby="cardTransferReceipt-message"
                      className={`h-auto min-h-36 w-full flex-col justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center ${errors.receipt ? "border-[var(--danger)]" : dragging ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-[var(--border)]"}`}
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">{dragging ? <ImagePlus size={22} /> : <UploadCloud size={22} />}</span>
                      <strong className="text-[13px]">{dragging ? "فایل را اینجا رها کنید" : "انتخاب یا کشیدن تصویر رسید"}</strong>
                      <small className="text-[11px] font-normal text-[var(--muted)]">رسید باید مبلغ، تاریخ و شمارهٔ پیگیری تراکنش را نشان دهد.</small>
                    </Button>
                  </div>
                )}
              </FormField>
            ) : (
              <div className="grid gap-1 sm:grid-cols-2 sm:gap-4">
                <TextField
                  id="cardTransferSourceCard"
                  label="شماره کارت مبدأ"
                  required
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="6037 9911 2233 4455"
                  maxLength={CARD_INPUT_MAX_LENGTH}
                  value={formatCardNumber(sourceCard)}
                  error={errors.sourceCardNumber}
                  hint={sourceBank ?? "شمارهٔ کارتی که از آن واریز کرده‌اید"}
                  controlClassName="text-left font-mono tabular-nums"
                  disabled={pending}
                  onChange={(event) => { setSourceCard(normalizeCardNumber(event.target.value)); clear("sourceCardNumber"); }}
                />
                <TextField
                  id="cardTransferTrackingCode"
                  label="کد رهگیری پرداخت"
                  required
                  dir="ltr"
                  autoComplete="off"
                  placeholder="مثلاً 482910375"
                  maxLength={cardToCardLimits.trackingCodeMax}
                  value={trackingCode}
                  error={errors.trackingCode}
                  hint="شماره پیگیری‌ای که بانک پس از واریز نشان می‌دهد"
                  controlClassName="text-left font-mono tabular-nums"
                  disabled={pending}
                  onChange={(event) => { setTrackingCode(normalizeTrackingCode(event.target.value)); clear("trackingCode"); }}
                />
              </div>
            )}
          </div>

          {formError && <InlineAlert compact status="danger" className="mt-1">{formError}</InlineAlert>}

          <Button type="submit" fullWidth variant="primary" isPending={pending} className="mt-4 min-h-12 gap-2 rounded-lg bg-[var(--brand-primary)] px-5 font-bold text-[var(--brand-primary-foreground)]">
            {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ثبت پرداخت..." : mode === "receipt" ? "ارسال رسید و ثبت پرداخت" : "ثبت اطلاعات پرداخت"}{!isPending && <ChevronLeft size={18} />}</>}
          </Button>
          <p className="mb-0 mt-3 text-center text-[11px] leading-6 text-[var(--muted)]">پس از ثبت، فروشگاه پرداخت را بررسی می‌کند و با تأیید آن، سفارش شما وارد مرحلهٔ آماده‌سازی می‌شود.</p>
        </form>
      </Card.Content>
    </Card>
  );
}
