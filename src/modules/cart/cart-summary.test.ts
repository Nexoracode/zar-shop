import assert from "node:assert/strict";
import test from "node:test";
import { countDistinctCartProducts } from "@/modules/cart/cart-summary";

test("cart badge counts each product once regardless of quantity or variant", () => {
  const items = [
    { productId: "product-a", quantity: 1, selectionKey: "default" },
    { productId: "product-a", quantity: 8, selectionKey: "red" },
    { productId: "product-b", quantity: 3, selectionKey: "large" },
  ];

  assert.equal(countDistinctCartProducts(items), 2);
});

test("cart badge is empty when the cart has no products", () => {
  assert.equal(countDistinctCartProducts([]), 0);
});
