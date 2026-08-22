import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { contactMessageSchema } from "@/modules/contact/schemas";
import { consumeContactMessageAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";

export async function POST(request: Request) {
  try {
    const blockedUntil = await consumeContactMessageAttempt(request);
    if (blockedUntil) return rateLimitResponse(blockedUntil);
    const input = contactMessageSchema.parse(await request.json());
    await db.contactMessage.create({ data: input });
    return NextResponse.json({ message: "پیام شما ارسال شد؛ تیم پشتیبانی به‌زودی پاسخ می‌دهد." }, { status: 201 });
  } catch (error) { return apiError(error); }
}
