import assert from "node:assert/strict";
import test from "node:test";
import { defaultAdminPageSize, parseAdminPagination, resolveAdminPagination } from "./admin-pagination";

test("uses the global admin page-size preference across list pages", () => {
  assert.deepEqual(parseAdminPagination({ page: "3" }, "50"), {
    requestedPage: 3,
    pageSize: 50,
  });
});

test("global admin page-size preference overrides a stale page query", () => {
  assert.equal(parseAdminPagination({ pageSize: "10" }, "20").pageSize, 20);
});

test("invalid admin page-size preferences fall back safely", () => {
  assert.equal(parseAdminPagination({}, "37").pageSize, defaultAdminPageSize);
});

test("resolves an admin page inside the available range", () => {
  assert.deepEqual(resolveAdminPagination(21, 9, 20), {
    page: 2,
    pageSize: 20,
    totalItems: 21,
    totalPages: 2,
    skip: 20,
  });
});
