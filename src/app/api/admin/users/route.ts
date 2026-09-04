import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { adminCreateUserSchema } from "@/modules/users/schemas";

/** A USER_MANAGER stays scoped to its own domain — same rule as changing an existing user's role. */
const nonAdminAssignableRoles = new Set(["CUSTOMER", "USER_MANAGER"]);

const uniqueFieldLabels: Record<string, string> = {
  phone: "این شماره موبایل قبلاً ثبت شده است.",
  email: "این ایمیل قبلاً ثبت شده است.",
};

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "users:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });

    const input = adminCreateUserSchema.parse(await request.json());
    if (actor.role !== "ADMIN" && !nonAdminAssignableRoles.has(input.role)) {
      return NextResponse.json({ message: "فقط مدیر کل می‌تواند این نقش را اختصاص دهد." }, { status: 403 });
    }

    const passwordHash = await hash(input.password, 12);
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email || null,
          firstName: input.firstName || null,
          lastName: input.lastName || null,
          role: input.role,
          status: input.status,
          passwordHash,
        },
        select: { id: true, phone: true, role: true },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "USER_CREATE", entityType: "User", entityId: created.id, ...auditRequestContext(request, { phone: created.phone, role: created.role }) } });
      return created;
    });
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const target = (error as { meta?: { target?: string[] } }).meta?.target ?? [];
      const field = target.find((column) => uniqueFieldLabels[column]);
      return NextResponse.json({ message: field ? uniqueFieldLabels[field] : "این کاربر قبلاً ثبت شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}
