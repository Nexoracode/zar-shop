import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createSession } from "@/modules/auth/session";
import { registerSchema } from "@/modules/auth/schemas";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const exists = await db.user.findFirst({ where: { OR: [{ email: input.email }, { phone: input.phone }] } });
    if (exists) return NextResponse.json({ message: "ایمیل یا شماره موبایل قبلاً ثبت شده است." }, { status: 409 });
    const { password, ...profile } = input;
    const user = await db.user.create({
      data: { ...profile, passwordHash: await hash(password, 12) },
    });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
