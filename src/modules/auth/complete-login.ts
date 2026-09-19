import { db } from "@/lib/db";
import type { UserRole } from "@generated/prisma/enums";
import { createSession, getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { mergeGuestCartIntoUser } from "@/modules/cart/guest-cart-merge";
import { getOrderSettings } from "@/modules/settings/order-settings";

/**
 * Shared post-authentication sequence for both password login and OTP login: merges any
 * guest cart into the account being signed into, records lastLoginAt, audit-logs an admin
 * login, and creates the session cookie. Credential/code verification happens before this
 * is called — this only ever runs once the caller is certain the sign-in is legitimate.
 *
 * `elevated` is set only by the dedicated admin sign-in route: it opens the admin window on the
 * new session and is what gets audited as ADMIN_LOGIN. A staff account signing in on the
 * storefront gets a customer-level session and no such audit entry.
 */
export async function completeLogin(request: Request, user: { id: string; role: UserRole }, options: { elevated?: boolean } = {}) {
  const previousUser = await getCurrentUser();
  // A guest cart is created lazily on first add-to-cart; signing into a real account must
  // not silently strand it, so fold it into the account being signed into before the guest
  // cookie is overwritten by createSession below.
  const mergeGuestCart = Boolean(previousUser?.isGuest && previousUser.id !== user.id);
  const orderSettings = mergeGuestCart ? await getOrderSettings() : null;
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    if (options.elevated && isAdminRole(user.role)) await tx.auditLog.create({ data: { actorId: user.id, action: "ADMIN_LOGIN", entityType: "Session", entityId: user.id, ...auditRequestContext(request) } });
    if (mergeGuestCart && previousUser && orderSettings) {
      await mergeGuestCartIntoUser(tx, previousUser.id, user.id, orderSettings.maxOrderItemQuantity);
      await tx.session.deleteMany({ where: { userId: previousUser.id } });
    }
  });
  await createSession(user.id, { elevated: options.elevated && isAdminRole(user.role) });
}
