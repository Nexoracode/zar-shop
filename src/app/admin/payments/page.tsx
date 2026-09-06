import Link from "next/link";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { formatDateTime, formatMoney } from "@/lib/format";
import { paymentStatusLabels, paymentStatusTones } from "@/modules/admin/labels";
import { requirePermission } from "@/modules/auth/session";
import { listAdminPayments, paymentProviderLabel, PAYMENT_STATUS_FILTERS, type AdminPaymentRow } from "@/modules/payments/admin-payments";

type SearchParams = Promise<{ page?: string; pageSize?: string; q?: string; status?: string; provider?: string }>;

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const { rows, pagination, query, status, provider, providerOptions } = await listAdminPayments(params);
  const filtered = Boolean(query || status || provider);

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader
        flush
        title="مدیریت پرداخت‌ها"
        description="تراکنش‌های درگاه‌های پرداخت و پرداخت‌های دستی سفارش‌ها را یک‌جا پیگیری کنید."
      />

      <section className="bp-frame relative p-4">
        <AdminListFilters
          path="/admin/payments"
          query={query}
          queryLabel="جستجوی پرداخت"
          queryPlaceholder="شماره سفارش یا شناسه تراکنش"
          filters={[
            {
              name: "status",
              label: "وضعیت پرداخت",
              value: status,
              options: [{ value: "", label: "همه وضعیت‌ها" }, ...PAYMENT_STATUS_FILTERS.map((item) => ({ value: item, label: paymentStatusLabels[item] }))],
            },
            {
              name: "provider",
              label: "درگاه پرداخت",
              value: provider,
              options: [{ value: "", label: "همه درگاه‌ها" }, ...providerOptions],
            },
          ]}
        />
      </section>

      <section className="bp-frame relative">
        {!rows.length ? (
          <AdminEmptyState
            title="پرداختی پیدا نشد"
            description={filtered ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز پرداختی در فروشگاه ثبت نشده است."}
          />
        ) : (
          <>
            <AdminReadOnlyTableToolbar
              label="فهرست فقط‌خواندنی پرداخت‌ها"
              description="برای حفظ سوابق مالی، تراکنش‌ها فقط قابل مشاهده‌اند."
            />

            <div className="md:hidden">
              {rows.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>

            <div className="hidden md:block">
              <BpTable ariaLabel="فهرست پرداخت‌ها" minWidth={900}>
                <thead>
                  <tr>
                    <BpTh className="w-10">#</BpTh>
                    <BpTh>شماره سفارش</BpTh>
                    <BpTh>مشتری</BpTh>
                    <BpTh>مبلغ</BpTh>
                    <BpTh>درگاه</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh>تاریخ پرداخت</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((payment, index) => (
                    <tr key={payment.id}>
                      <BpTd className="bp-muted">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="font-bold">
                        <Link href={`/admin/orders/${payment.order.id}`} dir="ltr" className="text-[var(--bp-accent)] hover:underline">{payment.order.orderNumber}</Link>
                      </BpTd>
                      <BpTd className="max-w-[220px]">
                        <span className="block truncate font-bold" title={payment.customerName}>{payment.customerName}</span>
                        <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{payment.customerContact}</span>
                      </BpTd>
                      <BpTd className="whitespace-nowrap font-bold text-[var(--bp-text)]">{formatMoney(payment.amount)}</BpTd>
                      <BpTd>{paymentProviderLabel(payment.provider)}</BpTd>
                      <BpTd><BpTag tone={paymentStatusTones[payment.status]} withDot>{paymentStatusLabels[payment.status]}</BpTag></BpTd>
                      <BpTd className="bp-muted whitespace-nowrap text-[12px]">{payment.paidAt ? formatDateTime(payment.paidAt) : "—"}</BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </div>

            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        )}
      </section>
    </div>
  );
}

function PaymentCard({ payment }: { payment: AdminPaymentRow }) {
  return (
    <article className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="bp-muted block text-[11px]">شماره سفارش</span>
          <Link href={`/admin/orders/${payment.order.id}`} dir="ltr" className="block truncate text-right text-sm font-bold text-[var(--bp-accent)]">{payment.order.orderNumber}</Link>
        </div>
        <BpTag tone={paymentStatusTones[payment.status]} withDot>{paymentStatusLabels[payment.status]}</BpTag>
      </div>
      <div className="min-w-0">
        <strong className="block truncate text-sm">{payment.customerName}</strong>
        <span dir="ltr" className="bp-muted block truncate text-right text-xs">{payment.customerContact}</span>
      </div>
      <div className="flex items-center justify-between gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px]">
        <span className="bp-muted">{paymentProviderLabel(payment.provider)} · {payment.paidAt ? formatDateTime(payment.paidAt) : "—"}</span>
        <strong className="text-[13px]">{formatMoney(payment.amount)}</strong>
      </div>
    </article>
  );
}
