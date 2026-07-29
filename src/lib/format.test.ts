import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney } from "./format";

test("formats stored rial amounts as toman for storefront display", () => {
  assert.equal(formatMoney(1_250_000, "IRT"), "۱۲۵٬۰۰۰ تومان");
});

test("keeps financial amounts in rial by default", () => {
  assert.equal(formatMoney(1_250_000), "۱٬۲۵۰٬۰۰۰ ریال");
});
