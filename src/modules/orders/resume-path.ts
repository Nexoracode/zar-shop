/**
 * Where a customer goes to pay an order they already placed. /checkout on its own builds a NEW order
 * from the cart, so a link that means "pay the one I have waiting" has to say so.
 */
export const RESUME_CHECKOUT_PATH = "/checkout?resume=1";
