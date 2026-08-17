"use client";

import { useState } from "react";
import { Alert, Button, Input, Label, Modal, TextArea, toast } from "@heroui/react";
import { MessageCircle, Star } from "lucide-react";

type Props = {
  productId: string;
  productName: string;
};

const reviewInputClass = "min-h-12 w-full rounded-md border border-slate-300 bg-transparent px-3 py-3 shadow-none hover:bg-transparent focus:border-[var(--brand-primary)] focus:bg-transparent data-[focused=true]:bg-transparent data-[hovered=true]:bg-transparent";
const reviewTextAreaClass = "min-h-40 w-full rounded-md border border-slate-300 bg-transparent px-3 py-3 shadow-none hover:bg-transparent focus:border-[var(--brand-primary)] focus:bg-transparent data-[focused=true]:bg-transparent data-[hovered=true]:bg-transparent";
const scores = [1, 2, 3, 4, 5] as const;

async function responseMessage(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return payload?.message ?? "ثبت دیدگاه با خطا روبه‌رو شد.";
}

function RatingSelector({ rating, onChange, compact = false }: { rating: number; onChange: (rating: number) => void; compact?: boolean }) {
  return <div className="flex items-start gap-3" dir="rtl">
    <strong className={`${compact ? "pt-2" : "pt-3"} shrink-0 text-xs text-[var(--foreground)]`}>امتیاز دهید</strong>
    <div className="flex items-start gap-1" role="radiogroup" aria-label="امتیاز محصول">
      {scores.map((score) => <div key={score} className="grid justify-items-center gap-0.5">
        <Button
          type="button"
          isIconOnly
          variant="ghost"
          aria-label={`${score.toLocaleString("fa-IR")} ستاره`}
          aria-pressed={rating === score}
          onPress={() => onChange(score)}
          className={`${compact ? "size-9 min-h-9 min-w-9" : "size-11 min-h-11 min-w-11"} text-amber-400`}
        >
          <Star className={compact ? "!size-6" : "!size-7"} fill={score <= rating ? "currentColor" : "none"} />
        </Button>
        <span className="text-[10px] leading-none text-[var(--muted)]">{score.toLocaleString("fa-IR")}</span>
      </div>)}
    </div>
  </div>;
}

export function OrderItemReviewAction({ productId, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function openComposer() {
    setError("");
    setOpen(true);
  }

  async function submitReview() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, body }),
      });
      const message = await responseMessage(response);
      if (!response.ok) throw new Error(message);
      setOpen(false);
      setTitle("");
      setBody("");
      toast.success(message);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "ثبت دیدگاه انجام نشد.";
      setError(message);
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
      <RatingSelector rating={rating} onChange={setRating} compact />
      <Button type="button" variant="secondary" onPress={openComposer} className="min-h-10 min-w-36 gap-2 border border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)]">
        <MessageCircle size={18} />ثبت دیدگاه
      </Button>
    </div>

    <Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => { if (!submitting) setOpen(nextOpen); }}>
      <Modal.Container size="md" placement="center" scroll="inside">
        <Modal.Dialog aria-label={`ثبت دیدگاه برای ${productName}`} dir="rtl">
          <Modal.Header className="pl-10"><Modal.Heading>ثبت امتیاز و دیدگاه</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="left-4 right-auto" /></Modal.Header>
          <Modal.Body><div className="grid gap-5">
            <p className="m-0 text-sm text-[var(--muted)]">دیدگاه شما برای «{productName}» پس از بررسی مدیریت منتشر می‌شود.</p>
            <RatingSelector rating={rating} onChange={setRating} />
            <Label className="grid gap-2 text-xs font-bold text-[var(--foreground)]">عنوان دیدگاه<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="خلاصه تجربه شما" variant="primary" className={reviewInputClass} /></Label>
            <Label className="grid gap-2 text-xs font-bold text-[var(--foreground)]">متن دیدگاه<TextArea value={body} onChange={(event) => setBody(event.target.value)} minLength={3} maxLength={3000} rows={6} placeholder="تجربه خود را با جزئیات بنویسید" variant="primary" className={reviewTextAreaClass} /></Label>
            {error ? <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert> : null}
          </div></Modal.Body>
          <Modal.Footer><Button type="button" variant="secondary" isDisabled={submitting} onPress={() => setOpen(false)}>انصراف</Button><Button type="button" variant="primary" isPending={submitting} isDisabled={submitting || rating === 0 || !title.trim() || body.trim().length < 3} onPress={() => void submitReview()}>ثبت دیدگاه</Button></Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}
