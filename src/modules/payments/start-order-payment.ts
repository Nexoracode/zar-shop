import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getStorefrontPaymentMethods, getStorefrontPaymentProvider, type StorefrontPaymentMethodId } from "@/modules/payments/storefront-methods";
import { getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getOrderSettings, orderExpiresAt } from "@/modules/settings/order-settings";

export class PendingOrderPaymentError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "PendingOrderPaymentError";
  }
}

export async function startPendingOrderPayment(input: { orderId: string; userId: string; paymentProvider: StorefrontPaymentMethodId }) {
  await expirePendingOrders();
  const [commerceSettings, orderSettings, methods] = await Promise.all([getCommerceSettings(), getOrderSettings(), getStorefrontPaymentMethods()]);
  if (!commerceSettings.onlinePaymentEnabled) throw new PendingOrderPaymentError("پرداخت آنلاین موقتاً غیرفعال است.", 503);
  if (!methods.some((method) => method.id === input.paymentProvider)) throw new PendingOrderPaymentError("روش پرداخت انتخاب‌شده در دسترس نیست.", 422);

  const order = await db.order.findFirst({
    where: { id: input.orderId, userId: input.userId },
    include: { user: { select: { email: true, phone: true, isGuest: true } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) throw new PendingOrderPaymentError("سفارش پیدا نشد.", 404);
  if (order.status !== "PENDING_PAYMENT" || order.expirationHandledAt) throw new PendingOrderPaymentError("این سفارش دیگر در انتظار پرداخت نیست.", 409);
  if (orderSettings.orderExpirationEnabled && order.expiresAt && order.expiresAt.getTime() <= Date.now()) throw new PendingOrderPaymentError("مهلت پرداخت این سفارش به پایان رسیده است.", 409);
  if (order.payments.some((payment) => payment.status === "SUCCESS" || payment.status === "REFUNDED")) throw new PendingOrderPaymentError("پرداخت این سفارش قبلاً تعیین تکلیف شده است.", 409);

  const provider = await getStorefrontPaymentProvider(input.paymentProvider);
  const callbackUrl = `${env.APP_URL}/api/payment/callback`;
  const activePayment = order.payments.find((payment) => payment.provider === input.paymentProvider && payment.status === "PENDING" && payment.authority);
  if (activePayment?.authority) return { redirectUrl: provider.redirectUrl(activePayment.authority, callbackUrl), reused: true };

  const payment = await db.payment.create({ data: { orderId: order.id, provider: input.paymentProvider, amount: order.total, status: "INITIATED" } });
  try {
    const address = order.shippingAddress as { phone?: string } | null;
    const request = await provider.request({
      amount: Number(order.total),
      orderId: order.id,
      callbackUrl,
      description: `پرداخت سفارش ${order.orderNumber}`,
      mobile: order.user.phone ?? address?.phone,
      email: order.user.isGuest ? undefined : (order.user.email ?? undefined),
    });
    await db.$transaction(async (transaction) => {
      await transaction.payment.update({ where: { id: payment.id }, data: { authority: request.authority, status: "PENDING" } });
      if (orderSettings.orderExpirationStart === "PAYMENT_STARTED_AT" && !order.expiresAt) {
        await transaction.order.update({ where: { id: order.id }, data: { expiresAt: orderExpiresAt(orderSettings, new Date()) } });
      }
    });
    return { redirectUrl: request.redirectUrl, reused: false };
  } catch (error) {
    await db.payment.deleteMany({ where: { id: payment.id, status: "INITIATED" } });
    throw error;
  }
}
