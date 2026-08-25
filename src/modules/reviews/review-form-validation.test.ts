import assert from "node:assert/strict";
import test from "node:test";
import { firstReviewFormError, hasReviewFormErrors, validateReviewForm } from "./review-form-validation";

const review = { rating: 4, title: "تجربه خوب", body: "کیفیت ساخت بسیار خوب بود.", isReply: false };

test("accepts a complete review", () => {
  const errors = validateReviewForm(review);
  assert.equal(hasReviewFormErrors(errors), false);
  assert.deepEqual(errors, {});
});

test("reports a missing rating as a field error, beside the stars", () => {
  assert.equal(validateReviewForm({ ...review, rating: 0 }).rating, "امتیاز خود را انتخاب کنید.");
});

test("requires a title on a new review", () => {
  assert.equal(validateReviewForm({ ...review, title: "   " }).title, "عنوان دیدگاه را وارد کنید.");
});

test("states the real minimum instead of a generic message", () => {
  assert.equal(validateReviewForm({ ...review, body: "ok" }).body, "متن دیدگاه باید حداقل ۳ نویسه باشد.");
  assert.equal(validateReviewForm({ ...review, body: "" }).body, "متن دیدگاه را بنویسید.");
});

test("enforces the server's upper bounds", () => {
  assert.match(validateReviewForm({ ...review, body: "ب".repeat(3001) }).body ?? "", /۳۰۰۰/);
  assert.match(validateReviewForm({ ...review, title: "ت".repeat(121) }).title ?? "", /۱۲۰/);
});

test("a reply needs only a body — no rating, no title", () => {
  assert.equal(hasReviewFormErrors(validateReviewForm({ rating: 0, title: "", body: "ممنون از توضیح شما.", isReply: true })), false);
});

test("focus goes to the first field in composer order, rating first", () => {
  assert.equal(firstReviewFormError(validateReviewForm({ ...review, rating: 0, title: "" })), "rating");
  assert.equal(firstReviewFormError(validateReviewForm({ ...review, title: "" })), "title");
  assert.equal(firstReviewFormError(validateReviewForm(review)), null);
});
