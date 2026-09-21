import assert from "node:assert/strict";
import test from "node:test";
import { bannerSliderConfigSchema, bannerSliderDisplayConfig, pruneDisplayForBanner } from "./banner-sliders";

const slide = (id: string) => ({ id, desktopMediaId: null, mobileMediaId: null, href: "/products" });

test("a tile look holds no more banners than it has slots", () => {
  assert.equal(bannerSliderConfigSchema.safeParse({ layout: "THREE_COLUMNS", slides: [slide("a"), slide("b"), slide("c")] }).success, true);
  assert.equal(bannerSliderConfigSchema.safeParse({ layout: "THREE_COLUMNS", slides: [slide("a"), slide("b"), slide("c"), slide("d")] }).success, false);
  assert.equal(bannerSliderConfigSchema.safeParse({ layout: "SINGLE", slides: [slide("a"), slide("b")] }).success, false);
});

test("a slider takes up to its own maximum", () => {
  assert.equal(bannerSliderConfigSchema.safeParse({ layout: "SLIDER_WIDE", slides: Array.from({ length: 10 }, (_, index) => slide(`s${index}`)) }).success, true);
  assert.equal(bannerSliderConfigSchema.safeParse({ layout: "SLIDER_WIDE", slides: Array.from({ length: 11 }, (_, index) => slide(`s${index}`)) }).success, false);
});

test("only sliders have display switches, and the peeking look has no arrows", () => {
  assert.deepEqual(bannerSliderDisplayConfig({ layout: "MOSAIC" }).parts, []);
  assert.deepEqual(bannerSliderDisplayConfig({ layout: "SLIDER_PEEK" }).parts.map((part) => part.id), ["dots"]);
  assert.deepEqual(bannerSliderDisplayConfig({ layout: "SLIDER_WIDE" }).parts.map((part) => part.id), ["arrows", "dots"]);
});

test("changing a slider's look drops the switches the new look doesn't have", () => {
  const display = { "BANNER_SLIDER:a": { enabled: true, hiddenParts: ["arrows", "dots"] } };
  assert.deepEqual(pruneDisplayForBanner(display, "BANNER_SLIDER:a", "SLIDER_PEEK"), { "BANNER_SLIDER:a": { enabled: true, hiddenParts: ["dots"] } });
  assert.deepEqual(pruneDisplayForBanner(display, "BANNER_SLIDER:a", "MOSAIC"), {});
  assert.equal(pruneDisplayForBanner(display, "BANNER_SLIDER:z", "MOSAIC"), display);
});
