export type ReviewFormField = "title" | "body";

export type ReviewFormValues = {
  rating: number;
  title: string;
  body: string;
  /** A reply carries only a body — no rating and no title. */
  isReply: boolean;
};

export type ReviewFormResult = {
  /**
   * The rating is a row of star buttons rather than a text field, so a missing rating is
   * reported as a toast instead of a message under a control.
   */
  ratingMessage: string | null;
  fieldErrors: Partial<Record<ReviewFormField, string>>;
};

/**
 * Mirrors `createProductReviewSchema` on the server. Client-side only — the server schema still
 * decides whether a review is accepted.
 */
export function validateReviewForm({ rating, title, body, isReply }: ReviewFormValues): ReviewFormResult {
  const fieldErrors: Partial<Record<ReviewFormField, string>> = {};
  const trimmedBody = body.trim();

  if (!trimmedBody) fieldErrors.body = "متن دیدگاه را بنویسید.";
  else if (trimmedBody.length < 3) fieldErrors.body = "متن دیدگاه باید حداقل ۳ نویسه باشد.";
  else if (trimmedBody.length > 3000) fieldErrors.body = "متن دیدگاه نباید بیشتر از ۳۰۰۰ نویسه باشد.";

  if (!isReply) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) fieldErrors.title = "عنوان دیدگاه را وارد کنید.";
    else if (trimmedTitle.length > 120) fieldErrors.title = "عنوان دیدگاه نباید بیشتر از ۱۲۰ نویسه باشد.";
  }

  return {
    ratingMessage: !isReply && rating === 0 ? "برای ثبت دیدگاه ابتدا امتیاز خود را انتخاب کنید." : null,
    fieldErrors,
  };
}

export function reviewFormHasProblems(result: ReviewFormResult) {
  return Boolean(result.ratingMessage) || Object.keys(result.fieldErrors).length > 0;
}
