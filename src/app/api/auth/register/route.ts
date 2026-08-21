import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createSession, getCurrentUser } from "@/modules/auth/session";
import { registerSchema } from "@/modules/auth/schemas";
import { consumeRegistrationAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { mergeGuestCartIntoUser } from "@/modules/cart/guest-cart-merge";
import { getOrderSettings } from "@/modules/settings/order-settings";

export async function POST(request: Request) {
  try {
    const [blockedUntil, previousUser] = await Promise.all([consumeRegistrationAttempt(request), getCurrentUser()]);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const input = registerSchema.parse(await request.json());
    const exists = await db.user.findFirst({ where: { OR: [{ email: input.email }, { phone: input.phone }] } });
    if (exists) return NextResponse.json({ message: "ایمیل یا شماره موبایل قبلاً ثبت شده است." }, { status: 409 });
    const { password, ...profile } = input;
    const passwordHash = await hash(password, 12);
    // A guest cart is created lazily on first add-to-cart; completing registration must
    // not silently strand it, so fold it into the new account before the guest cookie is
    // overwritten below.
    const mergeGuestCart = Boolean(previousUser?.isGuest);
    const orderSettings = mergeGuestCart ? await getOrderSettings() : null;
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { ...profile, passwordHash } });
      if (mergeGuestCart && previousUser && orderSettings) {
        await mergeGuestCartIntoUser(tx, previousUser.id, created.id, orderSettings.maxOrderItemQuantity);
        await tx.session.deleteMany({ where: { userId: previousUser.id } });
      }
      return created;
    });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
