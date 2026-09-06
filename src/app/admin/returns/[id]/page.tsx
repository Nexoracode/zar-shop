import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, ListChecks, ShoppingBag, UserRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { ReturnStatusPanel } from "@/components/admin/blueprint/return-status-panel";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { returnAdminNoteMaxLength } from "@/modules/orders/returns";

type Context = { params: Promise<{ id: string }> };

function DetailItem({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="bp-muted block text-[11px] font-bold">{label}</span>
      <span dir={ltr ? "ltr" : "rtl"} className={`mt-1 block break-all text-[13px] font-bold ${ltr ? "text-left font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

export default async function AdminReturnDetailPage({ params }: Context) {
  await requirePermission("orders:manage");
  const { id } = await params;

  const returnRequest = await db.return.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: { select: { id: true, name: true, sku: true, quantity: true, total: true } },
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
    },
  });
  if (!returnRequest) notFound();

  const { order } = returnRequest;
  const customerName = [returnRequest.user.firstName, returnRequest.user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام";

  return (
    <>
      <AdminPageHeader
        title={`درخواست مرجوعی سفارش ${order.orderNumber}`}
        description="اطلاعات مشتری و سفارش، دلیل کامل مرجوعی و مدیریت وضعیت درخواست."
        backHref="/admin/returns"
        backLabel="بازگشت به فهرست مرجوعی‌ها"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="bp-frame relative p-[18px]">
              <div className="mb-3 flex items-center gap-2"><UserRound size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">مشتری</h2></div>
              <dl className="grid gap-3">
                <DetailItem label="نام" value={customerName} />
                <DetailItem label="شماره همراه" value={returnRequest.user.phone ?? "ثبت نشده"} ltr />
                <DetailItem label="ایمیل" value={returnRequest.user.email ?? "ثبت نشده"} ltr />
              </dl>
            </section>

            <section className="bp-frame relative p-[18px]">
              <div className="mb-3 flex items-center gap-2"><ShoppingBag size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">سفارش مرتبط</h2></div>
              <dl className="grid gap-3">
                <div className="min-w-0">
                  <span className="bp-muted block text-[11px] font-bold">شماره سفارش</span>
                  <Link href={`/admin/orders/${order.id}`} dir="ltr" className="mt-1 block break-all text-left font-mono text-[12px] font-bold text-[var(--bp-accent)] hover:underline">{order.orderNumber}</Link>
                </div>
                <DetailItem label="مبلغ نهایی سفارش" value={formatMoney(order.total.toString())} />
                <DetailItem label="تاریخ ثبت سفارش" value={formatDateTime(order.createdAt)} />
                <DetailItem label="تاریخ ثبت درخواست" value={formatDateTime(returnRequest.createdAt)} />
                {returnRequest.resolvedAt && <DetailItem label="تاریخ رسیدگی" value={formatDateTime(returnRequest.resolvedAt)} />}
              </dl>
            </section>
          </div>

          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex items-center gap-2"><ClipboardList size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">دلیل مرجوعی</h2></div>
            <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-8">{returnRequest.reason}</p>
          </section>

          <section className="bp-frame relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-[18px] py-4">
              <ListChecks size={16} className="text-[var(--bp-accent)]" />
              <h2 className="m-0 text-[13px] font-bold">اقلام سفارش</h2>
              <span className="bp-muted text-[11px]">{order.items.length.toLocaleString("fa-IR")} قلم</span>
            </div>
            {order.items.length ? (
              <BpTable ariaLabel="اقلام سفارش مرجوعی" minWidth={480}>
                <thead>
                  <tr>
                    <BpTh className="w-10">#</BpTh>
                    <BpTh>نام کالا</BpTh>
                    <BpTh>SKU</BpTh>
                    <BpTh>تعداد</BpTh>
                    <BpTh>جمع</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={item.id}>
                      <BpTd className="bp-muted">{(index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="max-w-[220px] truncate text-[13px]">{item.name}</BpTd>
                      <BpTd className="text-[13px]"><span dir="ltr">{item.sku}</span></BpTd>
                      <BpTd className="text-[13px]">{item.quantity.toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="whitespace-nowrap text-[13px] font-bold">{formatMoney(item.total.toString())}</BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            ) : (
              <p className="bp-muted m-0 px-[18px] py-8 text-center text-[13px]">این سفارش قلمی ندارد.</p>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <ReturnStatusPanel returnId={returnRequest.id} status={returnRequest.status} adminNote={returnRequest.adminNote} noteMaxLength={returnAdminNoteMaxLength} />
        </aside>
      </div>
    </>
  );
}
