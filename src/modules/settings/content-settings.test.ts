import assert from "node:assert/strict";
import test from "node:test";
import { contentPageBySlug, contentSettingsDefaults, contentSettingsSchema, sanitizeContentSettings } from "./content-settings";

test("accepts complete FAQ and content page settings", () => {
  assert.equal(contentSettingsSchema.parse(contentSettingsDefaults).pages.length, 6);
});

test("rejects duplicate FAQ identifiers", () => {
  const duplicate = [contentSettingsDefaults.faqs[0], contentSettingsDefaults.faqs[0]];
  assert.equal(contentSettingsSchema.safeParse({ ...contentSettingsDefaults, faqs: duplicate }).success, false);
});

test("requires content for published pages", () => {
  const pages = contentSettingsDefaults.pages.map((page) => page.id === "ABOUT" ? { ...page, content: "" } : page);
  assert.equal(contentSettingsSchema.safeParse({ ...contentSettingsDefaults, pages }).success, false);
});

test("accepts image-only rich text pages", () => {
  const pages = contentSettingsDefaults.pages.map((page) => page.id === "ABOUT" ? { ...page, content: '<img src="https://example.com/about.jpg" alt="معرفی">' } : page);
  assert.equal(contentSettingsSchema.safeParse({ ...contentSettingsDefaults, pages }).success, true);
});

test("sanitizes stored rich text and resolves published page slugs", () => {
  const pages = contentSettingsDefaults.pages.map((page) => page.id === "ABOUT" ? { ...page, content: '<p>معرفی</p><script>alert(1)</script>' } : page);
  const settings = sanitizeContentSettings({ ...contentSettingsDefaults, pages });
  assert.equal(settings.pages[0].content.includes("script"), false);
  assert.equal(contentPageBySlug(settings, "about")?.id, "ABOUT");
});
