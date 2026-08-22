import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createSession, getCurrentUser } from "@/modules/auth/session";
import { registerCompleteSchema } from "@/modules/auth/schemas";
import { consumeRegistrationAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { hasVerifiedRegistrationOtp, invalidateVerifiedRegistrationOtp } from "@/modules/auth/phone-otp";
import { mergeGuestCartIntoUser } from "@/modules/cart/guest-cart-merge";
import { getOrderSettings } from "@/modules/settings/order-settings";

// Final step of the phone-first registration flow: the phone must already have a
// consumed REGISTER-purpose OTP (see /api/auth/otp/verify) proving it was actually
// verified — this route never trusts the client's say-so alone.
export async function POST(request: Request) {
  try {
    const [blockedUntil, previousUser] = await Promise.all([consumeRegistrationAttempt(request), getCurrentUser()]);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const input = registerCompleteSchema.parse(await request.json());
    if (!await hasVerifiedRegistrationOtp(input.phone)) {
      return NextResponse.json({ message: "شماره موبایل تأیید نشده است؛ ابتدا کد پیامکی را تأیید کنید." }, { status: 401 });
    }
    const exists = await db.user.findUnique({ where: { phone: input.phone }, select: { id: true } });
    if (exists) return NextResponse.json({ message: "این شماره موبایل قبلاً ثبت شده است." }, { status: 409 });
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
    await invalidateVerifiedRegistrationOtp(input.phone);
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, phone: user.phone } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
