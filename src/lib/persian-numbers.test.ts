import assert from "node:assert/strict";
import test from "node:test";
import { formatPersianNumber, integerToPersianWords, normalizeNumericValue, priceToPersianWords, rialPriceToTomanWords } from "./persian-numbers";

test("normalizes Persian and Arabic digits for APIs", () => {
  assert.equal(normalizeNumericValue("۱٬۲۳۴٫۵۶"), "1234.56");
  assert.equal(normalizeNumericValue("١,٢٣٤.٥٦"), "1234.56");
});

test("formats numeric values with Persian digits", () => {
  assert.equal(formatPersianNumber("1234.5"), "۱۲۳۴.۵");
  assert.equal(formatPersianNumber("1234567", true), "۱,۲۳۴,۵۶۷");
});

test("converts prices to Persian words", () => {
  assert.equal(integerToPersianWords("1250400"), "یک میلیون و دویست و پنجاه هزار و چهارصد");
  assert.equal(priceToPersianWords("1250400"), "یک میلیون و دویست و پنجاه هزار و چهارصد ریال");
  assert.equal(priceToPersianWords("0"), "صفر ریال");
  assert.equal(rialPriceToTomanWords("5000000"), "پانصد هزار تومان");
});
