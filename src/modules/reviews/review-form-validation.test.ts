import assert from "node:assert/strict";
import test from "node:test";
import { reviewFormHasProblems, validateReviewForm } from "./review-form-validation";

const review = { rating: 4, title: "تجربه خوب", body: "کیفیت ساخت بسیار خوب بود.", isReply: false };

test("accepts a complete review", () => {
  const result = validateReviewForm(review);
  assert.equal(reviewFormHasProblems(result), false);
  assert.equal(result.ratingMessage, null);
  assert.deepEqual(result.fieldErrors, {});
});

test("reports a missing rating separately, for a toast rather than a field message", () => {
  const result = validateReviewForm({ ...review, rating: 0 });
  assert.match(result.ratingMessage ?? "", /امتیاز/);
  assert.deepEqual(result.fieldErrors, {});
});

test("requires a title on a new review", () => {
  assert.equal(validateReviewForm({ ...review, title: "   " }).fieldErrors.title, "عنوان دیدگاه را وارد کنید.");
});

test("states the real minimum instead of a generic message", () => {
  assert.equal(validateReviewForm({ ...review, body: "ok" }).fieldErrors.body, "متن دیدگاه باید حداقل ۳ نویسه باشد.");
  assert.equal(validateReviewForm({ ...review, body: "" }).fieldErrors.body, "متن دیدگاه را بنویسید.");
});

test("enforces the server's upper bounds", () => {
  assert.match(validateReviewForm({ ...review, body: "ب".repeat(3001) }).fieldErrors.body ?? "", /۳۰۰۰/);
  assert.match(validateReviewForm({ ...review, title: "ت".repeat(121) }).fieldErrors.title ?? "", /۱۲۰/);
});

test("a reply needs only a body — no rating, no title", () => {
  const result = validateReviewForm({ rating: 0, title: "", body: "ممنون از توضیح شما.", isReply: true });
  assert.equal(reviewFormHasProblems(result), false);
});
