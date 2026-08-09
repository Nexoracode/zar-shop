import assert from "node:assert/strict";
import test from "node:test";
import { buildProductAttributeGroups, categoryAttributeSchema, validateProductAttributes } from "./attributes";

const definitions = [{
  id: "group_general",
  name: "مشخصات کلی",
  attributes: [
    { id: "attribute_ram", name: "رم", allowsMultiple: false },
    { id: "attribute_suitable", name: "مناسب برای", allowsMultiple: true },
  ],
}];

test("category attributes support grouped single and multiple values", () => {
  assert.equal(categoryAttributeSchema.safeParse(definitions).success, true);
  const result = validateProductAttributes(definitions, [
    { attributeId: "attribute_ram", values: ["۱۲ گیگابایت"] },
    { attributeId: "attribute_suitable", values: ["آقایان", "خانم‌ها"] },
  ]);
  assert.equal(result.ok, true);
});

test("single-value category attributes reject multiple product values", () => {
  const result = validateProductAttributes(definitions, [{ attributeId: "attribute_ram", values: ["۸", "۱۲"] }]);
  assert.equal(result.ok, false);
});

test("product attributes reject definitions from another category", () => {
  const result = validateProductAttributes(definitions, [{ attributeId: "attribute_other", values: ["نامعتبر"] }]);
  assert.equal(result.ok, false);
});

test("storefront attribute groups omit empty definitions", () => {
  const groups = buildProductAttributeGroups(definitions, [{ attributeId: "attribute_ram", values: ["۱۲ گیگابایت"] }]);
  assert.deepEqual(groups, [{ id: "group_general", name: "مشخصات کلی", attributes: [{ id: "attribute_ram", name: "رم", values: ["۱۲ گیگابایت"] }] }]);
});
