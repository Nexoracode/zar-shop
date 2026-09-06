import assert from "node:assert/strict";
import { test } from "node:test";
import { paginationWindow } from "@/lib/pagination-window";

test("lists every page when there are five or fewer", () => {
  assert.deepEqual(paginationWindow(1, 1), [1]);
  assert.deepEqual(paginationWindow(3, 5), [1, 2, 3, 4, 5]);
});

test("collapses the tail when near the start", () => {
  assert.deepEqual(paginationWindow(2, 40), [1, 2, 3, 4, "ellipsis", 40]);
});

test("collapses the head when near the end", () => {
  assert.deepEqual(paginationWindow(39, 40), [1, "ellipsis", 37, 38, 39, 40]);
});

test("collapses both sides in the middle", () => {
  assert.deepEqual(paginationWindow(20, 40), [1, "ellipsis", 19, 20, 21, "ellipsis", 40]);
});

test("stays a fixed length no matter how many pages", () => {
  assert.equal(paginationWindow(500, 1000).length, 7);
});
