import assert from "node:assert/strict";
import test from "node:test";
import { buildCategoryAuditChanges, type CategoryAuditSnapshot } from "./category-audit";

const category: CategoryAuditSnapshot = {
  name: "انگشتر",
  slug: "rings",
  description: "دسته انگشترها",
  parentId: null,
  imageId: null,
  isActive: true,
  featured: false,
  sortOrder: 1,
};

test("category audit only reports values that actually changed", () => {
  const changes = buildCategoryAuditChanges(category, { ...category, slug: "gold-rings" });

  assert.deepEqual(changes, [{
    path: "slug",
    label: "نشانی دسته‌بندی",
    before: "rings",
    after: "gold-rings",
  }]);
});
