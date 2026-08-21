import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createSession, getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { loginSchema } from "@/modules/auth/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";
import { assertLoginAllowed, clearLoginFailures, rateLimitResponse, recordLoginFailure } from "@/modules/auth/rate-limit";
import { mergeGuestCartIntoUser } from "@/modules/cart/guest-cart-merge";
import { getOrderSettings } from "@/modules/settings/order-settings";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const [blockedUntil, previousUser] = await Promise.all([assertLoginAllowed(request, input.email), getCurrentUser()]);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user || user.status !== "ACTIVE" || !(await compare(input.password, user.passwordHash))) {
      await recordLoginFailure(request, input.email);
      return NextResponse.json({ message: "ایمیل یا رمز عبور نادرست است." }, { status: 401 });
    }
    // A guest cart is created lazily on first add-to-cart; logging into a real account
    // must not silently strand it, so fold it into the account being signed into before
    // the guest cookie is overwritten below.
    const mergeGuestCart = Boolean(previousUser?.isGuest && previousUser.id !== user.id);
    const orderSettings = mergeGuestCart ? await getOrderSettings() : null;
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      if (isAdminRole(user.role)) await tx.auditLog.create({ data: { actorId: user.id, action: "ADMIN_LOGIN", entityType: "Session", entityId: user.id, ...auditRequestContext(request) } });
      if (mergeGuestCart && previousUser && orderSettings) {
        await mergeGuestCartIntoUser(tx, previousUser.id, user.id, orderSettings.maxOrderItemQuantity);
        await tx.session.deleteMany({ where: { userId: previousUser.id } });
      }
    });
    await createSession(user.id);
    await clearLoginFailures(request, input.email);
    return NextResponse.json({ user: { id: user.id, role: user.role } });
  } catch (error) { return apiError(error); }
}
