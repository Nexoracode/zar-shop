import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OrderPaymentForm } from "@/components/order-payment-form";
import { requireUser } from "@/modules/auth/session";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getStorefrontPaymentMethods } from "@/modules/payments/storefront-methods";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";

export const dynamic = "force-dynamic";

export default async function PendingOrderPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [user, { orderId }] = await Promise.all([requireUser(), params]);
  await expirePendingOrders();
  const [order, methods, settings, orderSettings] = await Promise.all([
    db.order.findFirst({ where: { id: orderId, userId: user.id }, select: { id: true, orderNumber: true, total: true, status: true, expiresAt: true, expirationHandledAt: true, payments: { select: { status: true } } } }),
    getStorefrontPaymentMethods(),
    getGeneralStoreSettings(),
    getOrderSettings(),
  ]);
  if (!order) notFound();
  if (order.status !== "PENDING_PAYMENT" || order.expirationHandledAt || order.payments.some((payment) => payment.status === "SUCCESS" || payment.status === "REFUNDED")) redirect(`/account/orders/${order.id}`);
  return <OrderPaymentForm order={{ id: order.id, orderNumber: order.orderNumber, total: order.total.toString(), expiresAt: order.expiresAt?.toISOString() ?? null }} methods={methods} currency={settings.currency} warningMinutes={orderSettings.orderWarningMinutes} />;
}
