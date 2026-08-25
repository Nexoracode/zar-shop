"use client";

import { useRef, useState } from "react";
import { Button, Modal, toast } from "@heroui/react";
import { MessageCircle } from "lucide-react";
import { TextAreaField, TextField } from "@/components/form-field";
import { ReviewRatingField } from "@/components/review-rating-field";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { firstReviewFormError, hasReviewFormErrors, validateReviewForm, type ReviewFormErrors, type ReviewFormField } from "@/modules/reviews/review-form-validation";

type Props = {
  productId: string;
  productName: string;
};

export function OrderItemReviewAction({ productId, productName }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function openComposer() {
    setErrors({});
    setOpen(true);
  }

  function clearError(field: ReviewFormField) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function focusFirstError(found: ReviewFormErrors) {
    const first = firstReviewFormError(found);
    if (!first) return;
    const selector = first === "rating" ? "[data-rating-star='1']" : `[name="${first}"]`;
    bodyRef.current?.querySelector<HTMLElement>(selector)?.focus();
  }

  async function submitReview() {
    const found = validateReviewForm({ rating, title, body, isReply: false });
    if (hasReviewFormErrors(found)) {
      setErrors(found);
      focusFirstError(found);
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
      <ReviewRatingField rating={rating} onChange={setRating} size="sm" showLabel={false} />
      <Button type="button" variant="secondary" onPress={openComposer} className="min-h-10 min-w-36 gap-2 border border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)]">
        <MessageCircle size={18} />ثبت دیدگاه
      </Button>
    </div>

    <Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => { if (!submitting) setOpen(nextOpen); }} isDismissable={false}>
      <Modal.Container size="md" placement="center" scroll="inside">
        <Modal.Dialog aria-label={`ثبت دیدگاه برای ${productName}`} dir="rtl">
          <Modal.Header className="pl-10"><Modal.Heading>ثبت امتیاز و دیدگاه</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="left-4 right-auto" /></Modal.Header>
          <Modal.Body><div ref={bodyRef} className="grid gap-3">
            <p className="m-0 text-sm text-[var(--muted)]">دیدگاه شما برای «{productName}» پس از بررسی مدیریت منتشر می‌شود.</p>
            <ReviewRatingField rating={rating} onChange={(value) => { setRating(value); clearError("rating"); }} error={errors.rating} />
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
