"use client";

import { useRef, useState } from "react";
import { Button, Modal, toast } from "@heroui/react";
import { MessageCircle, Star } from "lucide-react";
import { TextAreaField, TextField } from "@/components/form-field";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { reviewFormHasProblems, validateReviewForm, type ReviewFormField } from "@/modules/reviews/review-form-validation";

type Props = {
  productId: string;
  productName: string;
};

const scores = [1, 2, 3, 4, 5] as const;

function RatingSelector({ rating, onChange, compact = false, showLabel = true }: { rating: number; onChange: (rating: number) => void; compact?: boolean; showLabel?: boolean }) {
  return <div className="flex items-start gap-3" dir="rtl">
    {showLabel ? <strong className={`${compact ? "pt-2" : "pt-3"} shrink-0 text-xs text-[var(--foreground)]`}>امتیاز دهید</strong> : null}
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Partial<Record<ReviewFormField, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function openComposer() {
    setErrors({});
    setOpen(true);
  }

  function clearError(field: ReviewFormField) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function submitReview() {
    const result = validateReviewForm({ rating, title, body, isReply: false });
    if (reviewFormHasProblems(result)) {
      setErrors(result.fieldErrors);
      // The rating is a star row, not a field, so it is reported as a toast.
      if (result.ratingMessage) toast.danger("امتیاز انتخاب نشده است", { description: result.ratingMessage });
      const first = (["title", "body"] as const).find((field) => result.fieldErrors[field]);
      if (first) bodyRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const payload = await requestJson<{ message?: string }>(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim(), body: body.trim() }),
      }, { fallbackMessage: "ثبت دیدگاه انجام نشد." });
      setOpen(false);
      setTitle("");
      setBody("");
      setErrors({});
      toast.success(payload?.message ?? "دیدگاه شما ثبت شد");
    } catch (caught) {
      toast.danger("ثبت دیدگاه انجام نشد", { description: requestErrorMessage(caught, "ثبت دیدگاه انجام نشد.") });
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <RatingSelector rating={rating} onChange={setRating} compact showLabel={false} />
      <Button type="button" variant="secondary" onPress={openComposer} className="min-h-10 min-w-36 gap-2 border border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)]">
        <MessageCircle size={18} />ثبت دیدگاه
      </Button>
    </div>

    <Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => { if (!submitting) setOpen(nextOpen); }}>
      <Modal.Container size="md" placement="center" scroll="inside">
        <Modal.Dialog aria-label={`ثبت دیدگاه برای ${productName}`} dir="rtl">
          <Modal.Header className="pl-10"><Modal.Heading>ثبت امتیاز و دیدگاه</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="left-4 right-auto" /></Modal.Header>
          <Modal.Body><div ref={bodyRef} className="grid gap-4">
            <p className="m-0 text-sm text-[var(--muted)]">دیدگاه شما برای «{productName}» پس از بررسی مدیریت منتشر می‌شود.</p>
            <RatingSelector rating={rating} onChange={setRating} />
            <TextField
              name="title"
              label="عنوان دیدگاه"
              required
              maxLength={120}
              placeholder="خلاصه تجربه شما"
              value={title}
              error={errors.title}
              onChange={(event) => { setTitle(event.target.value); clearError("title"); }}
            />
            <TextAreaField
              name="body"
              label="متن دیدگاه"
              required
              rows={6}
              maxLength={3000}
              placeholder="تجربه خود را با جزئیات بنویسید"
              hint="حداقل ۳ نویسه"
              value={body}
              error={errors.body}
              onChange={(event) => { setBody(event.target.value); clearError("body"); }}
            />
          </div></Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="secondary" isDisabled={submitting} onPress={() => setOpen(false)}>انصراف</Button>
            {/* Enabled regardless of validity: pressing it is how the reader finds out what is missing. */}
            <Button type="button" variant="primary" isPending={submitting} onPress={() => void submitReview()}>ثبت دیدگاه</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}
