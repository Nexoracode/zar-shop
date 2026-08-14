import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus, ProductReviewStatus, ProductStatus, UserStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";
import { releaseInventory } from "@/modules/orders/inventory";

const bodySchema = z.object({
  entity: z.enum(["products", "categories", "orders", "users", "reviews", "colors", "paymentGateways", "smsProviders", "smsCampaigns"]),
  action: z.string().min(1).max(191),
  ids: z.array(z.string().min(1)).min(1).max(100),
});

const productStatuses = new Set(Object.values(ProductStatus));
const orderStatuses = new Set(Object.values(OrderStatus));
const userStatuses = new Set(Object.values(UserStatus));
const reviewStatuses = new Set(Object.values(ProductReviewStatus));

export async function PATCH(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ message: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "اطلاعات ویرایش گروهی معتبر نیست." }, { status: 422 });
  const { entity, action, ids } = parsed.data;
  const uniqueIds = [...new Set(ids)];
  const adminOnlyEntities = new Set(["paymentGateways", "smsProviders", "smsCampaigns"]);
  if (adminOnlyEntities.has(entity) && actor.role !== "ADMIN") return NextResponse.json({ message: "این عملیات فقط برای مدیر اصلی مجاز است." }, { status: 403 });
  const permission = entity === "orders" ? "orders:manage" : entity === "users" ? "users:manage" : "catalog:manage";
  if (!adminOnlyEntities.has(entity) && !hasPermission(actor.role, permission)) return NextResponse.json({ message: "برای این عملیات دسترسی کافی ندارید." }, { status: 403 });

  let updated = 0;
  if (entity === "products") {
    if (action.startsWith("status:")) {
      const status = action.slice(7) as ProductStatus;
      if (!productStatuses.has(status)) return NextResponse.json({ message: "وضعیت محصول معتبر نیست." }, { status: 422 });
      updated = (await db.product.updateMany({ where: { id: { in: uniqueIds } }, data: { status } })).count;
    } else if (action === "featured:on" || action === "featured:off") {
      updated = (await db.product.updateMany({ where: { id: { in: uniqueIds } }, data: { featured: action === "featured:on" } })).count;
    } else if (action.startsWith("category:")) {
      const categoryId = action.slice(9);
      if (categoryId !== "none" && !await db.category.findUnique({ where: { id: categoryId }, select: { id: true } })) return NextResponse.json({ message: "دسته‌بندی انتخاب‌شده پیدا نشد." }, { status: 404 });
      updated = (await db.product.updateMany({ where: { id: { in: uniqueIds } }, data: { categoryId: categoryId === "none" ? null : categoryId } })).count;
    } else return NextResponse.json({ message: "عملیات محصول معتبر نیست." }, { status: 422 });
  } else if (entity === "categories") {
    if (action === "active:on" || action === "active:off") updated = (await db.category.updateMany({ where: { id: { in: uniqueIds } }, data: { isActive: action === "active:on" } })).count;
    else if (action === "featured:on" || action === "featured:off") updated = (await db.category.updateMany({ where: { id: { in: uniqueIds } }, data: { featured: action === "featured:on" } })).count;
    else return NextResponse.json({ message: "عملیات دسته‌بندی معتبر نیست." }, { status: 422 });
  } else if (entity === "orders") {
    if (!action.startsWith("status:")) return NextResponse.json({ message: "عملیات سفارش معتبر نیست." }, { status: 422 });
    const status = action.slice(7) as OrderStatus;
    if (!orderStatuses.has(status)) return NextResponse.json({ message: "وضعیت سفارش معتبر نیست." }, { status: 422 });
    const allowedCurrentStatuses: Partial<Record<OrderStatus, OrderStatus[]>> = { PROCESSING: ["PAID"], SHIPPED: ["PROCESSING"], DELIVERED: ["SHIPPED"], CANCELLED: ["PENDING_PAYMENT"] };
    const allowed = allowedCurrentStatuses[status];
    if (!allowed) return NextResponse.json({ message: "این وضعیت برای ویرایش سریع مجاز نیست." }, { status: 422 });
    if (status === "CANCELLED") {
      updated = await db.$transaction(async (transaction) => {
        let count = 0;
        for (const id of uniqueIds) {
          const order = await transaction.order.findFirst({ where: { id, status: "PENDING_PAYMENT" }, include: { items: true } });
          if (!order) continue;
          const cancelled = await transaction.order.updateMany({ where: { id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED", inventoryReserved: false } });
          if (cancelled.count !== 1) continue;
          if (order.inventoryReserved) await releaseInventory(transaction, order.items);
          await transaction.payment.updateMany({ where: { orderId: id, status: { in: ["INITIATED", "PENDING"] } }, data: { status: "CANCELLED" } });
          await transaction.promotionReward.updateMany({ where: { redeemedOrderId: id, redeemedAt: null }, data: { redeemedOrderId: null } });
          await transaction.promotionRedemption.deleteMany({ where: { orderId: id } });
          count += 1;
        }
        return count;
      });
    } else {
      updated = (await db.order.updateMany({ where: { id: { in: uniqueIds }, status: { in: allowed } }, data: { status } })).count;
    }
  } else if (entity === "users") {
    if (!action.startsWith("status:")) return NextResponse.json({ message: "عملیات کاربر معتبر نیست." }, { status: 422 });
    const status = action.slice(7) as UserStatus;
    if (!userStatuses.has(status)) return NextResponse.json({ message: "وضعیت کاربر معتبر نیست." }, { status: 422 });
    updated = (await db.user.updateMany({ where: { id: { in: uniqueIds, not: actor.id }, role: { not: "ADMIN" } }, data: { status } })).count;
  } else if (entity === "reviews") {
    if (!action.startsWith("status:")) return NextResponse.json({ message: "عملیات دیدگاه معتبر نیست." }, { status: 422 });
    const status = action.slice(7) as ProductReviewStatus;
    if (!reviewStatuses.has(status) || status === "PENDING") return NextResponse.json({ message: "وضعیت دیدگاه معتبر نیست." }, { status: 422 });
    updated = await db.$transaction(async (transaction) => {
      const result = await transaction.productReview.updateMany({ where: { id: { in: uniqueIds } }, data: { status, moderatedAt: new Date(), moderatedById: actor.id } });
      if (status === "REJECTED") await transaction.productReview.updateMany({ where: { parentId: { in: uniqueIds }, status: "APPROVED" }, data: { status: "REJECTED", moderatedAt: new Date(), moderatedById: actor.id, moderationNote: "دیدگاه اصلی به‌صورت گروهی رد شده است." } });
      return result.count;
    });
  } else if (entity === "colors") {
    if (action !== "active:on" && action !== "active:off") return NextResponse.json({ message: "عملیات رنگ معتبر نیست." }, { status: 422 });
    updated = (await db.color.updateMany({ where: { id: { in: uniqueIds } }, data: { isActive: action === "active:on" } })).count;
  } else if (entity === "paymentGateways") {
    if (action !== "delete") return NextResponse.json({ message: "عملیات درگاه پرداخت معتبر نیست." }, { status: 422 });
    updated = (await db.paymentGatewayConfig.deleteMany({ where: { id: { in: uniqueIds } } })).count;
  } else if (entity === "smsProviders") {
    if (action !== "delete") return NextResponse.json({ message: "عملیات ارائه‌دهنده پیامک معتبر نیست." }, { status: 422 });
    updated = (await db.smsProviderConfig.deleteMany({ where: { id: { in: uniqueIds } } })).count;
  } else {
    if (action !== "delete") return NextResponse.json({ message: "عملیات تاریخچه پیامک معتبر نیست." }, { status: 422 });
    updated = (await db.smsCampaign.deleteMany({ where: { id: { in: uniqueIds }, actorId: { not: null } } })).count;
  }

  if (!updated) return NextResponse.json({ message: "هیچ‌کدام از موارد انتخاب‌شده شرایط این تغییر را ندارند." }, { status: 409 });
  await db.auditLog.create({ data: { actorId: actor.id, action: "BULK_UPDATE", entityType: entity, ...auditRequestContext(request, { action, requestedIds: uniqueIds, updated }) } });
  return NextResponse.json({ updated });
}
