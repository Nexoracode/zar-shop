import assert from "node:assert/strict";
import test from "node:test";
import { createProductReviewSchema, productReviewReportSchema, productReviewVoteSchema } from "./schemas";

test("root review requires rating, title and body", () => {
  assert.equal(createProductReviewSchema.safeParse({ rating: 5, title: "عالی", body: "از خرید راضی بودم" }).success, true);
  assert.equal(createProductReviewSchema.safeParse({ title: "بدون امتیاز", body: "متن دیدگاه" }).success, false);
});

test("reply accepts body only", () => {
  assert.equal(createProductReviewSchema.safeParse({ parentId: "review-id", body: "پاسخ کامل" }).success, true);
  assert.equal(createProductReviewSchema.safeParse({ parentId: "review-id", rating: 5, body: "پاسخ" }).success, false);
});

test("vote and report inputs are constrained", () => {
  assert.equal(productReviewVoteSchema.safeParse({ value: -1 }).success, true);
  assert.equal(productReviewVoteSchema.safeParse({ value: 2 }).success, false);
  assert.equal(productReviewReportSchema.safeParse({ reason: "SPAM" }).success, true);
  assert.equal(productReviewReportSchema.safeParse({ reason: "UNKNOWN" }).success, false);
});
