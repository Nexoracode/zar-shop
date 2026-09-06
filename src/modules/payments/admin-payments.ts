import "server-only";

import type { Prisma } from "@generated/prisma/client";
import type { PaymentStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";

/** The statuses the admin filter offers — the transient ones (INITIATED, CANCELLED) are not
 * useful to filter by on their own. A direct URL with any other status just returns no rows. */
export const PAYMENT_STATUS_FILTERS = ["SUCCESS", "PENDING", "FAILED", "REFUNDED"] as const;

/** Payment providers are free-text strings on the row (`"MANUAL"`, `"zarinpal"`, `"mock"`, …), so
 * map the ones we know and fall back to the raw value for anything new. */
export function paymentProviderLabel(provider: string) {
  switch (provider.toLowerCase()) {
    case "manual": return "ثبت دستی";
    case "zarinpal": return "زرین‌پال";
    case "zibal": return "زیبال";
    case "mock": return "آزمایشی";
    default: return provider;
  }
}

export type AdminPaymentRow = {
  id: string;
  provider: string;
  amount: string;
  status: PaymentStatus;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
  order: { id: string; orderNumber: string; total: string };
  customerName: string;
  customerContact: string;
};

type ListParams = { page?: string; pageSize?: string; q?: string; status?: string; provider?: string };

export async function listAdminPayments(params: ListParams) {
  const query = params.q?.trim() ?? "";
  const status = (PAYMENT_STATUS_FILTERS as readonly string[]).includes(params.status ?? "")
    ? (params.status as PaymentStatus)
    : undefined;
  const provider = params.provider?.trim() || undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);

  const where: Prisma.PaymentWhereInput = {
    ...(status ? { status } : {}),
    ...(provider ? { provider } : {}),
    ...(query
      ? {
          OR: [
            { order: { orderNumber: { contains: query } } },
            { referenceId: { contains: query } },
            { authority: { contains: query } },
          ],
        }
      : {}),
  };

  const [totalItems, providerRows] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({ select: { provider: true }, distinct: ["provider"], orderBy: { provider: "asc" } }),
  ]);
  const pagination = resolveAdminPagination(totalItems, requestedPage, pageSize);
  const payments = await db.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
    select: {
      id: true,
      provider: true,
      amount: true,
      status: true,
      referenceId: true,
      authority: true,
      paidAt: true,
      createdAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
        },
      },
    },
  });

  const rows: AdminPaymentRow[] = payments.map((payment) => ({
    id: payment.id,
    provider: payment.provider,
    amount: payment.amount.toString(),
    status: payment.status,
    reference: payment.referenceId ?? payment.authority ?? null,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    order: { id: payment.order.id, orderNumber: payment.order.orderNumber, total: payment.order.total.toString() },
    customerName: [payment.order.user.firstName, payment.order.user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام",
    customerContact: payment.order.user.phone ?? payment.order.user.email ?? "—",
  }));

  return {
    rows,
    pagination,
    query,
    status: status ?? "",
    provider: provider ?? "",
    providerOptions: providerRows.map((row) => ({ value: row.provider, label: paymentProviderLabel(row.provider) })),
  };
}
