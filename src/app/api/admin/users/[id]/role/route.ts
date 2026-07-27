import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";

const roleSchema = z.object({
  role: z.enum(["CUSTOMER", "ADMIN", "CATALOG_MANAGER", "USER_MANAGER", "ORDER_MANAGER"]),
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

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ message: "کاربر پیدا نشد." }, { status: 404 });

  if (actor.role !== "ADMIN" && (target.role === "ADMIN" || parsed.data.role === "ADMIN")) {
    return NextResponse.json({ message: "فقط مدیر کل می‌تواند نقش مدیر کل را تغییر دهد." }, { status: 403 });
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
        metadata: { previousRole: target.role, nextRole: parsed.data.role },
      },
    });
    return updated;
  });

  return NextResponse.json(user);
}
