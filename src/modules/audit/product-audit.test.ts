import assert from "node:assert/strict";
import test from "node:test";
import { buildAuditChanges, productAuditSnapshot } from "./product-audit";

test("product audit reports exact nested field and previous/new values", () => {
  const changes = buildAuditChanges(
    { name: "انگشتر قدیمی", options: [{ name: "سایز", values: [{ value: "۵۲", stock: 1 }] }] },
    { name: "انگشتر جدید", options: [{ name: "سایز", values: [{ value: "۵۲", stock: 4 }] }] },
  );

  assert.deepEqual(changes.map(({ path, before, after }) => ({ path, before, after })), [
    { path: "name", before: "انگشتر قدیمی", after: "انگشتر جدید" },
    { path: "options.0.values.0.stock", before: 1, after: 4 },
  ]);
  assert.match(changes[1].label, /تنوع‌ها.*ردیف 1.*موجودی/);
});

test("product snapshot keeps identifiers and serializes dates", () => {
  const snapshot = productAuditSnapshot({
    id: "product-id",
    sku: "R-1",
    name: "انگشتر",
    discountStartsAt: new Date("2026-08-10T00:00:00.000Z"),
    category: { id: "category-id", name: "انگشتر" },
  });

  assert.equal(snapshot.sku, "R-1");
  assert.equal(snapshot.discountStartsAt, "2026-08-10T00:00:00.000Z");
  assert.deepEqual(snapshot.category, { id: "category-id", name: "انگشتر" });
});
