import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission, isAdminRole } from "@/modules/auth/permissions";
import { assignableUserRoles } from "@/modules/users/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";

const roleSchema = z.object({
  role: z.enum(assignableUserRoles),
});

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, "users:manage")) {
    return NextResponse.json({ message: "شما اجازه تغییر نقش کاربران را ندارید." }, { status: 403 });
  }

  const { id } = await context.params;
  if (id === actor.id) {
    return NextResponse.json({ message: "امکان تغییر نقش حساب کاربری خودتان وجود ندارد." }, { status: 409 });
  }

  const parsed = roleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "نقش انتخاب‌شده معتبر نیست." }, { status: 422 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, passwordHash: true } });
  if (!target) return NextResponse.json({ message: "کاربر پیدا نشد." }, { status: 404 });

  // The panel only opens with the staff password (never an SMS code), so a customer who signed up
  // OTP-only would be handed a role they can't use. Better to say so now than have them locked out.
  if (isAdminRole(parsed.data.role) && !isAdminRole(target.role) && !target.passwordHash) {
    return NextResponse.json({ message: "این کاربر هنوز رمز عبور ندارد و نمی‌تواند وارد پنل شود؛ از او بخواهید از «فراموشی رمز عبور» یک رمز تعیین کند." }, { status: 409 });
  }

  // A non-ADMIN actor only reaches here via `users:manage` (held by USER_MANAGER), which is
  // scoped to user accounts, not to the other domain-manager roles. It may only move a user
  // between CUSTOMER and USER_MANAGER — granting/revoking CATALOG_MANAGER, ORDER_MANAGER, or
  // ADMIN stays ADMIN-only, otherwise a USER_MANAGER could mint access outside its own domain.
  const nonAdminAssignableRoles = new Set(["CUSTOMER", "USER_MANAGER"]);
  if (actor.role !== "ADMIN" && (!nonAdminAssignableRoles.has(target.role) || !nonAdminAssignableRoles.has(parsed.data.role))) {
    return NextResponse.json({ message: "فقط مدیر کل می‌تواند این نقش را اختصاص دهد." }, { status: 403 });
  }

  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ message: "حداقل یک مدیر کل باید در سیستم باقی بماند." }, { status: 409 });
    }
  }

  const user = await db.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: { role: parsed.data.role }, select: { id: true, role: true } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "USER_ROLE_UPDATE",
        entityType: "User",
        entityId: id,
        ...auditRequestContext(request, { previousRole: target.role, nextRole: parsed.data.role }),
      },
    });
    return updated;
  });

  return NextResponse.json(user);
}
