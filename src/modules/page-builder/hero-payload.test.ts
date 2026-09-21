import assert from "node:assert/strict";
import test from "node:test";
import { heroSettingsPayload, heroSlideLabel, validateHeroSlide, type HeroSlideDraft } from "./hero-payload";

const media = (id: string) => ({ id, title: id, url: `/${id}.png`, type: "IMAGE" as const });
const base = { contentMode: "WITH_CONTENT" as const, title: "عنوان", description: "توضیحات بنر اصلی", buttonLabel: "مشاهده", buttonHref: "/products" };
const slide = (id: string, overrides: Partial<HeroSlideDraft> = {}): HeroSlideDraft => ({ id, href: "/products", desktopMedia: media(`${id}-d`), mobileMedia: null, ...overrides });

test("the payload carries the untouched hero fields and mirrors the first banner into the legacy fields", () => {
  const payload = heroSettingsPayload(base, [slide("a", { href: " /sale ", mobileMedia: media("a-m") }), slide("b")]);
  assert.equal(payload.heroTitle, "عنوان");
  assert.equal(payload.heroButtonHref, "/sale");
  assert.equal(payload.heroDesktopMediaId, "a-d");
  assert.equal(payload.heroMobileMediaId, "a-m");
  assert.deepEqual(payload.heroSlides.map((entry) => [entry.id, entry.href, entry.desktopMediaId, entry.mobileMediaId]), [["a", "/sale", "a-d", "a-m"], ["b", "/products", "b-d", null]]);
});

test("without banners the legacy fields fall back to the stored button link and no images", () => {
  const payload = heroSettingsPayload(base, []);
  assert.equal(payload.heroButtonHref, "/products");
  assert.equal(payload.heroDesktopMediaId, null);
  assert.deepEqual(payload.heroSlides, []);
});

test("a banner needs a desktop image and a safe link", () => {
  assert.deepEqual(validateHeroSlide(slide("a")), {});
  assert.ok(validateHeroSlide(slide("a", { desktopMedia: null })).desktop);
  assert.ok(validateHeroSlide(slide("a", { href: "" })).href);
  assert.ok(validateHeroSlide(slide("a", { href: "javascript:alert(1)" })).href);
  assert.equal(validateHeroSlide(slide("a", { href: "https://example.com/x" })).href, undefined);
});

test("names banners by their position", () => {
  assert.equal(heroSlideLabel(0), "بنر شماره یک");
  assert.equal(heroSlideLabel(9), "بنر شماره ده");
  assert.equal(heroSlideLabel(10), "بنر شماره ۱۱");
});
