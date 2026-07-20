import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createSession } from "@/modules/auth/session";
import { loginSchema } from "@/modules/auth/schemas";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user || user.status !== "ACTIVE" || !(await compare(input.password, user.passwordHash))) {
      return NextResponse.json({ message: "ایمیل یا رمز عبور نادرست است." }, { status: 401 });
    }
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, role: user.role } });
  } catch (error) { return apiError(error); }
}
