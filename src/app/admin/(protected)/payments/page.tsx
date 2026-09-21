import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { formatDateTime, formatMoney } from "@/lib/format";
import { paymentStatusLabels, paymentStatusTones } from "@/modules/admin/labels";
import { requirePermission } from "@/modules/auth/session";
import { listAdminPayments, paymentProviderLabel, PAYMENT_STATUS_FILTERS, type AdminPaymentRow } from "@/modules/payments/admin-payments";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type SearchParams = Promise<{ page?: string; pageSize?: string; q?: string; status?: string; provider?: string }>;

const PAYMENTS_TABLE_ID = "payments";

const paymentColumns = [
  { id: "orderNumber", label: "شماره سفارش" },
  { id: "customer", label: "مشتری" },
  { id: "amount", label: "مبلغ" },
  { id: "provider", label: "درگاه" },
  { id: "status", label: "وضعیت" },
  { id: "paidAt", label: "تاریخ پرداخت" },
];

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const [{ rows, pagination, query, status, provider, providerOptions }, initialHiddenColumns] = await Promise.all([listAdminPayments(params), readHiddenColumns(PAYMENTS_TABLE_ID)]);
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
          filters={[]}
        />
      </section>

      <section className="bp-frame relative">
        {!rows.length ? (
          <AdminEmptyState
            title="پرداختی پیدا نشد"
            description={filtered ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز پرداختی در فروشگاه ثبت نشده است."}
          />
        ) : (
          <AdminColumnVisibility tableId={PAYMENTS_TABLE_ID} columns={paymentColumns} initialHidden={initialHiddenColumns}>
            <AdminReadOnlyTableToolbar
              label="فهرست فقط‌خواندنی پرداخت‌ها"
              description="برای حفظ سوابق مالی، تراکنش‌ها فقط قابل مشاهده‌اند."
              leading={<AdminColumnSettingsButton />}
            />

            <div className="md:hidden">
              {rows.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>

            <div className="hidden md:block">
              <BpTable ariaLabel="فهرست پرداخت‌ها" minWidth={960}>
                <thead>
                  <tr>
                    <BpTh className="w-10">#</BpTh>
                    <AdminColumn id="orderNumber"><BpTh>شماره سفارش</BpTh></AdminColumn>
                    <AdminColumn id="customer"><BpTh>مشتری</BpTh></AdminColumn>
                    <AdminColumn id="amount"><BpTh>مبلغ</BpTh></AdminColumn>
                    <AdminColumn id="provider"><BpTh><span className="inline-flex items-center">درگاه<AdminColumnFilter path="/admin/payments" ariaLabel="فیلتر درگاه پرداخت" groups={[{ name: "provider", label: "درگاه پرداخت", value: provider, options: [{ value: "", label: "همه درگاه‌ها" }, ...providerOptions] }]} /></span></BpTh></AdminColumn>
                    <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter path="/admin/payments" ariaLabel="فیلتر وضعیت پرداخت" groups={[{ name: "status", label: "وضعیت پرداخت", value: status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...PAYMENT_STATUS_FILTERS.map((item) => ({ value: item, label: paymentStatusLabels[item] }))] }]} /></span></BpTh></AdminColumn>
                    <AdminColumn id="paidAt"><BpTh>تاریخ پرداخت</BpTh></AdminColumn>
                    <BpTh>جزئیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((payment, index) => (
                    <tr key={payment.id}>
                      <BpTd className="bp-muted">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                      <AdminColumn id="orderNumber">
                        <BpTd className="font-bold">
                          <Link href={`/admin/orders/${payment.order.id}`} dir="ltr" className="text-[var(--bp-accent)] hover:underline">{payment.order.orderNumber}</Link>
                        </BpTd>
                      </AdminColumn>
                      <AdminColumn id="customer">
                        <BpTd className="max-w-[220px]">
                          <span className="block truncate font-bold" title={payment.customerName}>{payment.customerName}</span>
                          <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{payment.customerContact}</span>
                        </BpTd>
                      </AdminColumn>
                      <AdminColumn id="amount"><BpTd className="whitespace-nowrap font-bold text-[var(--bp-text)]">{formatMoney(payment.amount)}</BpTd></AdminColumn>
                      <AdminColumn id="provider"><BpTd>{paymentProviderLabel(payment.provider)}</BpTd></AdminColumn>
                      <AdminColumn id="status"><BpTd><BpTag tone={paymentStatusTones[payment.status]} withDot>{paymentStatusLabels[payment.status]}</BpTag></BpTd></AdminColumn>
                      <AdminColumn id="paidAt"><BpTd className="bp-muted whitespace-nowrap text-[12px]">{payment.paidAt ? formatDateTime(payment.paidAt) : "—"}</BpTd></AdminColumn>
                      <BpTd>
                        <div className="flex items-center justify-start">
                          <Link href={`/admin/payments/${payment.id}`} aria-label={`مشاهده جزئیات پرداخت سفارش ${payment.order.orderNumber}`} title="مشاهده جزئیات" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={15} strokeWidth={1.5} /></Link>
                        </div>
                      </BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </div>

            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </AdminColumnVisibility>
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
      <Link href={`/admin/payments/${payment.id}`} className="bp-btn bp-btn-secondary bp-btn-sm w-full gap-2"><Eye size={15} />مشاهده جزئیات پرداخت</Link>
    </article>
  );
}
