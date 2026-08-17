import { AccountOrdersPanel, type AccountOrderSummary } from "@/components/account-orders-panel";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";
import { orderStatusLabels } from "@/modules/admin/labels";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser();
  await expirePendingOrders();
  const [orders, settings, orderSettings] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        invoice: { select: { id: true } },
        items: {
          include: {
            product: {
              select: {
                slug: true,
                media: { orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, include: { media: true } },
              },
            },
          },
        },
      },
    }),
    getGeneralStoreSettings(),
    getOrderSettings(),
  ]);

  const summaries: AccountOrderSummary[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: orderStatusLabels[order.status],
    date: formatDate(order.createdAt),
    total: formatMoney(order.total.toString(), settings.currency),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    expiresAt: order.expiresAt?.toISOString() ?? null,
    hasInvoice: Boolean(order.invoice),
    images: order.items.flatMap((item) => {
      const media = item.product?.media[0]?.media;
      return media ? [{ id: item.id, url: media.url, alt: media.alt ?? item.name }] : [];
    }).slice(0, 5),
  }));

  return <AccountOrdersPanel orders={summaries} showCountdown={orderSettings.showOrderCountdown} warningMinutes={orderSettings.orderWarningMinutes} />;
}
