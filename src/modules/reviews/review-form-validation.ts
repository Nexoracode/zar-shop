export type ReviewFormField = "rating" | "title" | "body";

export type ReviewFormValues = {
  rating: number;
  title: string;
  body: string;
  /** A reply carries only a body — no rating and no title. */
  isReply: boolean;
};

export type ReviewFormErrors = Partial<Record<ReviewFormField, string>>;

/** Fields in the order they appear in the composer, so focus lands on the first one in error. */
export const reviewFormFieldOrder: ReviewFormField[] = ["rating", "title", "body"];

/**
 * Mirrors `createProductReviewSchema` on the server. Client-side only — the server schema still
 * decides whether a review is accepted.
 */
export function validateReviewForm({ rating, title, body, isReply }: ReviewFormValues): ReviewFormErrors {
  const errors: ReviewFormErrors = {};
  const trimmedBody = body.trim();

  if (!trimmedBody) errors.body = "متن دیدگاه را بنویسید.";
  else if (trimmedBody.length < 3) errors.body = "متن دیدگاه باید حداقل ۳ نویسه باشد.";
  else if (trimmedBody.length > 3000) errors.body = "متن دیدگاه نباید بیشتر از ۳۰۰۰ نویسه باشد.";

  if (!isReply) {
    if (rating === 0) errors.rating = "امتیاز خود را انتخاب کنید.";
    const trimmedTitle = title.trim();
    if (!trimmedTitle) errors.title = "عنوان دیدگاه را وارد کنید.";
    else if (trimmedTitle.length > 120) errors.title = "عنوان دیدگاه نباید بیشتر از ۱۲۰ نویسه باشد.";
  }

  return errors;
}

export function hasReviewFormErrors(errors: ReviewFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function firstReviewFormError(errors: ReviewFormErrors) {
  return reviewFormFieldOrder.find((field) => errors[field]) ?? null;
}
