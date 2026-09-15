import { NextResponse } from "next/server";
import { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";

export async function POST(_: Request, context: { params: Promise<{ productId: string }> }) {
  try {
    const [user, { productId }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return new NextResponse(null, { status: 204 });
    const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
    if (!product) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });
    const now = new Date();
    const existing = await db.productVisit.findUnique({ where: { userId_productId: { userId: user.id, productId } }, select: { id: true, visitedAt: true } });
    if (existing) {
      await db.productVisit.update({ where: { id: existing.id }, data: { visitedAt: now, ...(now.getTime() - existing.visitedAt.getTime() >= 30 * 60 * 1000 ? { visitCount: { increment: 1 } } : {}) } });
    } else {
      try {
        await db.productVisit.create({ data: { userId: user.id, productId, visitedAt: now } });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
        await db.productVisit.update({ where: { userId_productId: { userId: user.id, productId } }, data: { visitedAt: now } });
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
