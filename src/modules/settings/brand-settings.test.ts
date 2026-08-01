import assert from "node:assert/strict";
import test from "node:test";
import { brandCssVariables, brandSettingsDefaults, brandSettingsInputSchema, brandSettingsSchema } from "./brand-settings";

test("brand settings normalize valid hex colors", () => {
  assert.equal(brandSettingsInputSchema.parse({ ...brandSettingsDefaults, brandPrimaryColor: "#abcdef" }).brandPrimaryColor, "#ABCDEF");
});

test("brand settings reject invalid colors", () => {
  assert.equal(brandSettingsInputSchema.safeParse({ ...brandSettingsDefaults, brandPrimaryColor: "red" }).success, false);
});

test("brand css selects a readable foreground", () => {
  const settings = brandSettingsSchema.parse({ ...brandSettingsDefaults, mainLogoMedia: null, darkLogoMedia: null, faviconMedia: null, socialImageMedia: null });
  assert.equal(brandCssVariables(settings)["--brand-primary-foreground"], "#FFFFFF");
});
