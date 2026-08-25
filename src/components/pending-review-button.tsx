"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toast } from "@heroui/react";
import { Star, X } from "lucide-react";
import { TextAreaField, TextField } from "@/components/form-field";
import { ReviewRatingField } from "@/components/review-rating-field";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { firstReviewFormError, hasReviewFormErrors, validateReviewForm, type ReviewFormErrors, type ReviewFormField } from "@/modules/reviews/review-form-validation";
import { reviewFieldLimits } from "@/modules/reviews/schemas";

export function PendingReviewButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Starts unrated. It used to default to 5, which both hid the "you have not rated yet" case
  // and silently filed a five-star review for anyone who ignored the stars.
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [busy, setBusy] = useState(false);

  function clearError(field: ReviewFormField) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function openComposer() {
    setRating(0);
    setTitle("");
    setBody("");
    setErrors({});
    setOpen(true);
  }

  async function submit() {
    const found = validateReviewForm({ rating, title, body, isReply: false });
    if (hasReviewFormErrors(found)) {
      setErrors(found);
      const first = firstReviewFormError(found);
      if (first) bodyRef.current?.querySelector<HTMLElement>(first === "rating" ? "[data-rating-star='1']" : `[name="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await requestJson(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim(), body: body.trim() }),
      }, { fallbackMessage: "ثبت دیدگاه انجام نشد." });
      setOpen(false);
      toast.success("دیدگاه شما ثبت شد", { description: "پس از بررسی مدیریت نمایش داده می‌شود." });
      router.refresh();
    } catch (reason) {
      toast.danger("ثبت دیدگاه انجام نشد", { description: requestErrorMessage(reason, "ثبت دیدگاه انجام نشد.") });
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button type="button" variant="primary" fullWidth onPress={openComposer} className="gap-2"><Star size={17} />ثبت امتیاز و دیدگاه</Button>
    <Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => { if (!busy) setOpen(nextOpen); }} variant="blur" isDismissable={false}>
      <Modal.Container placement="center" size="lg">
        <Modal.Dialog aria-label={`ثبت دیدگاه برای ${productName}`} dir="rtl" className="mx-3 bg-[var(--surface)]">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">دیدگاه درباره {productName}</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger>
          </Modal.Header>
          {/* No <form> and no native `required`: validation is ours, so the browser never raises
              its own bubble inside a modal that manages its own focus. */}
          <Modal.Body className="p-5">
            <div ref={bodyRef} className="grid gap-3">
              <ReviewRatingField rating={rating} onChange={(value) => { setRating(value); clearError("rating"); }} error={errors.rating} />
              <TextField name="title" label="عنوان دیدگاه" required maxLength={reviewFieldLimits.title} placeholder="خلاصه تجربه شما" value={title} error={errors.title} onChange={(event) => { setTitle(event.target.value); clearError("title"); }} />
              <TextAreaField name="body" label="متن دیدگاه" required rows={5} maxLength={reviewFieldLimits.body} hint="حداقل ۳ نویسه" placeholder="تجربه خود را با جزئیات بنویسید" value={body} error={errors.body} onChange={(event) => { setBody(event.target.value); clearError("body"); }} />
              <Button type="button" variant="primary" isPending={busy} onPress={() => void submit()}>ثبت دیدگاه</Button>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}
