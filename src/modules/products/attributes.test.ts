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

test("category attributes keep selectable suggested values", () => {
  const result = categoryAttributeSchema.parse([{
    id: "group_specs",
    name: "مشخصات فنی",
    attributes: [{ id: "attribute_memory", name: "حافظه", allowsMultiple: false, suggestedValues: ["۱۲۸ گیگابایت", "۲۵۶ گیگابایت"] }],
  }]);
  assert.deepEqual(result[0].attributes[0].suggestedValues, ["۱۲۸ گیگابایت", "۲۵۶ گیگابایت"]);
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

test("category attributes default to non-important", () => {
  const parsed = categoryAttributeSchema.parse([{
    id: "group_general",
    name: "General specifications",
    attributes: [{ id: "attribute_ram", name: "RAM", allowsMultiple: false }],
  }]);
  assert.equal(parsed[0].attributes[0].important, false);
});

test("important category attributes are exposed to the storefront", () => {
  const groups = buildProductAttributeGroups([{
    id: "group_general",
    name: "General specifications",
    attributes: [{ id: "attribute_ram", name: "RAM", allowsMultiple: false, important: true }],
  }], [{ attributeId: "attribute_ram", values: ["12 GB"] }]);
  assert.equal(groups[0].attributes[0].important, true);
});
