import assert from "node:assert/strict";
import test from "node:test";
import { parseTooltipText } from "./tooltip-text";

test("a single line stays plain text, even when it contains a colon", () => {
  assert.deepEqual(parseTooltipText("حذف برند"), [{ kind: "text", text: "حذف برند" }]);
  assert.deepEqual(parseTooltipText("نتیجه: موفق"), [{ kind: "text", text: "نتیجه: موفق" }]);
  assert.deepEqual(parseTooltipText("   "), []);
});

test("a heading followed by label/value rows keeps that shape", () => {
  assert.deepEqual(parseTooltipText("استان تهران\nفروش: ۱۲٬۰۰۰\nتعداد: ۳ سفارش"), [
    { kind: "title", text: "استان تهران" },
    { kind: "pair", label: "فروش", value: "۱۲٬۰۰۰" },
    { kind: "pair", label: "تعداد", value: "۳ سفارش" },
  ]);
});

test("the discount window reads as a heading with از and تا rows", () => {
  assert.deepEqual(parseTooltipText("تخفیف فعال\nاز ۱۴۰۵/۰۶/۲۸ ۱۰:۰۰\nتا ۱۴۰۵/۰۷/۰۱ ۱۰:۰۰"), [
    { kind: "title", text: "تخفیف فعال" },
    { kind: "pair", label: "از", value: "۱۴۰۵/۰۶/۲۸ ۱۰:۰۰" },
    { kind: "pair", label: "تا", value: "۱۴۰۵/۰۷/۰۱ ۱۰:۰۰" },
  ]);
});

test("when every line is a row there is no heading, and only the first colon splits", () => {
  assert.deepEqual(parseTooltipText("رنگ: قرمز، آبی\nسایز: ۴۰، ۴۲"), [
    { kind: "pair", label: "رنگ", value: "قرمز، آبی" },
    { kind: "pair", label: "سایز", value: "۴۰، ۴۲" },
  ]);
  assert.deepEqual(parseTooltipText("عنوان\nمهلت: ۱۵:۳۰"), [
    { kind: "title", text: "عنوان" },
    { kind: "pair", label: "مهلت", value: "۱۵:۳۰" },
  ]);
});

test("a clock time is not mistaken for a label, and extra lines are plain text", () => {
  assert.deepEqual(parseTooltipText("گزارش امروز\n۱۵:۳۰ ثبت شد\nتوضیح بدون دو‌نقطه"), [
    { kind: "title", text: "گزارش امروز" },
    { kind: "text", text: "۱۵:۳۰ ثبت شد" },
    { kind: "text", text: "توضیح بدون دو‌نقطه" },
  ]);
});

test("very long tooltips are cut to a sane number of lines", () => {
  const lines = parseTooltipText(Array.from({ length: 40 }, (_, index) => `خط ${index}`).join("\n"));
  assert.equal(lines.length, 12);
});
