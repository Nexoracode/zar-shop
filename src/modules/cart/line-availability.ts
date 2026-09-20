import { isVariantSnapshotValid } from "@/modules/products/variants";

type Variants = Parameters<typeof isVariantSnapshotValid>[0];

/**
 * Whether a cart line can no longer be bought at all: the product is off sale, or the variant it
 * was added with was removed, switched off or ran out. Such a line stays in the
 * cart so the customer can see it, but it is left out of every count, total and order.
 *
 * A line that is merely asked for in a larger quantity than is left is not "unavailable" — that is
 * a quantity problem the customer can fix by lowering it.
 */
export function isCartLineUnavailable(product: { status: string; variants: Variants }, selectionKey: string) {
  return product.status !== "ACTIVE" || !isVariantSnapshotValid(product.variants, selectionKey, 1);
}
