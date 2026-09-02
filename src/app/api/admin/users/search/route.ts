import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";

export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "orders:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 3) return NextResponse.json([]);
    if (query.length > 100) return NextResponse.json({ message: "عبارت جستجو بیش از حد طولانی است." }, { status: 422 });

    const users = await db.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, isGuest: true, _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    return NextResponse.json(users.map((user) => ({
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام",
      phone: user.phone,
      email: user.email,
      isGuest: user.isGuest,
      orderCount: user._count.orders,
    })));
  } catch (error) {
    return apiError(error);
  }
}
