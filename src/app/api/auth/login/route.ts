import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createSession } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { loginSchema } from "@/modules/auth/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user || user.status !== "ACTIVE" || !(await compare(input.password, user.passwordHash))) {
      return NextResponse.json({ message: "ایمیل یا رمز عبور نادرست است." }, { status: 401 });
    }
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      if (isAdminRole(user.role)) await tx.auditLog.create({ data: { actorId: user.id, action: "ADMIN_LOGIN", entityType: "Session", entityId: user.id, ...auditRequestContext(request) } });
    });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, role: user.role } });
  } catch (error) { return apiError(error); }
}
