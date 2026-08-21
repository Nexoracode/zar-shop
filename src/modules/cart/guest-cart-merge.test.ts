import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@generated/prisma/client";
import { mergeGuestCartIntoUser, type CartMergeTransaction } from "./guest-cart-merge";

type Item = { id: string; cartId: string; productId: string; selectionKey: string; selectedOptions: Prisma.JsonValue | null; quantity: number };
type CartRow = { id: string; userId: string; items: Item[] };

function mergeDb(carts: CartRow[], stockByProduct: Record<string, number>) {
  let nextId = 1;
  const transaction = {
    cart: {
      findUnique: async ({ where }: { where: { userId: string } }) => {
        const cart = carts.find((item) => item.userId === where.userId);
        return cart ? { id: cart.id, userId: cart.userId, items: cart.items } : null;
      },
      upsert: async ({ where }: { where: { userId: string } }) => {
        let cart = carts.find((item) => item.userId === where.userId);
        if (!cart) { cart = { id: `cart-${nextId++}`, userId: where.userId, items: [] }; carts.push(cart); }
        return cart;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = carts.findIndex((item) => item.id === where.id);
        const [removed] = carts.splice(index, 1);
        return removed;
      },
    },
    cartItem: {
      findUnique: async ({ where }: { where: { cartId_productId_selectionKey: { cartId: string; productId: string; selectionKey: string } } }) => {
        const { cartId, productId, selectionKey } = where.cartId_productId_selectionKey;
        const cart = carts.find((item) => item.id === cartId);
        return cart?.items.find((item) => item.productId === productId && item.selectionKey === selectionKey) ?? null;
      },
      upsert: async ({ where, create, update }: { where: { cartId_productId_selectionKey: { cartId: string; productId: string; selectionKey: string } }; create: Omit<Item, "id">; update: { quantity: number } }) => {
        const { cartId, productId, selectionKey } = where.cartId_productId_selectionKey;
        const cart = carts.find((item) => item.id === cartId)!;
        const existing = cart.items.find((item) => item.productId === productId && item.selectionKey === selectionKey);
        if (existing) { existing.quantity = update.quantity; return existing; }
        const created: Item = { id: `item-${nextId++}`, ...create };
        cart.items.push(created);
        return created;
      },
    },
    product: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const stock = stockByProduct[where.id];
        return stock === undefined ? null : { stock };
      },
    },
  } as unknown as CartMergeTransaction;
  return { carts, transaction };
}

test("moves guest cart items into the target user's cart and removes the guest cart", async () => {
  const { carts, transaction } = mergeDb(
    [{ id: "cart-guest", userId: "guest-1", items: [{ id: "i1", cartId: "cart-guest", productId: "product-1", selectionKey: "", selectedOptions: null, quantity: 2 }] }],
    { "product-1": 10 },
  );
  await mergeGuestCartIntoUser(transaction, "guest-1", "user-1", 10);
  assert.equal(carts.find((cart) => cart.userId === "guest-1"), undefined);
  const targetCart = carts.find((cart) => cart.userId === "user-1")!;
  assert.equal(targetCart.items.length, 1);
  assert.equal(targetCart.items[0].quantity, 2);
});

test("sums quantities when the target already has the same product and option", async () => {
  const { carts, transaction } = mergeDb(
    [
      { id: "cart-guest", userId: "guest-1", items: [{ id: "i1", cartId: "cart-guest", productId: "product-1", selectionKey: "size:m", selectedOptions: { size: "m" }, quantity: 3 }] },
      { id: "cart-user", userId: "user-1", items: [{ id: "i2", cartId: "cart-user", productId: "product-1", selectionKey: "size:m", selectedOptions: { size: "m" }, quantity: 1 }] },
    ],
    { "product-1": 100 },
  );
  await mergeGuestCartIntoUser(transaction, "guest-1", "user-1", 100);
  const targetCart = carts.find((cart) => cart.userId === "user-1")!;
  assert.equal(targetCart.items.length, 1);
  assert.equal(targetCart.items[0].quantity, 4);
});

test("clamps the merged quantity to available stock and the order settings cap", async () => {
  const { carts, transaction } = mergeDb(
    [{ id: "cart-guest", userId: "guest-1", items: [{ id: "i1", cartId: "cart-guest", productId: "product-1", selectionKey: "", selectedOptions: null, quantity: 50 }] }],
    { "product-1": 5 },
  );
  await mergeGuestCartIntoUser(transaction, "guest-1", "user-1", 10);
  const targetCart = carts.find((cart) => cart.userId === "user-1")!;
  assert.equal(targetCart.items[0].quantity, 5);
});

test("drops items whose product is out of stock instead of moving them", async () => {
  const { carts, transaction } = mergeDb(
    [{ id: "cart-guest", userId: "guest-1", items: [{ id: "i1", cartId: "cart-guest", productId: "product-1", selectionKey: "", selectedOptions: null, quantity: 1 }] }],
    { "product-1": 0 },
  );
  await mergeGuestCartIntoUser(transaction, "guest-1", "user-1", 10);
  assert.equal(carts.find((cart) => cart.userId === "guest-1"), undefined);
  assert.equal(carts.find((cart) => cart.userId === "user-1"), undefined);
});

test("is a no-op when the guest has no cart", async () => {
  const { carts, transaction } = mergeDb([], {});
  await mergeGuestCartIntoUser(transaction, "guest-1", "user-1", 10);
  assert.equal(carts.length, 0);
});

test("removes an already-empty guest cart without touching the target", async () => {
  const { carts, transaction } = mergeDb([{ id: "cart-guest", userId: "guest-1", items: [] }], {});
  await mergeGuestCartIntoUser(transaction, "guest-1", "user-1", 10);
  assert.equal(carts.length, 0);
});
