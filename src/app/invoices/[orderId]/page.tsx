import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";

type InvoiceOrder = Prisma.OrderGetPayload<{ include: { invoice: true; items: true; payments: true } }>;
type InvoiceItem = InvoiceOrder["items"][number];
type InvoicePayment = InvoiceOrder["payments"][number];

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser();
  const { orderId } = await params;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { invoice: true, items: true, payments: true } }) as InvoiceOrder | null;
  if (!order?.invoice) notFound();
  if (order.userId !== user.id && user.role === "CUSTOMER") redirect("/account");
  const successful = order.payments.find((payment: InvoicePayment) => payment.status === "SUCCESS");
  const cell = "border-b border-[#e7e6e2] px-3 py-3 text-sm";

  return (
    <main className="bg-[#f5f5f3] px-4 py-10 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[900px] border border-[#e7e6e2] bg-white p-5 shadow-[0_16px_50px_rgba(20,35,61,0.06)] sm:p-9">
        <div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#e7e6e2] pb-6 sm:flex-row sm:items-start">
          <div><span className="text-xs font-bold text-[#785b27]">فاکتور رسمی فروش</span><h1 className="m-0 mt-1 text-3xl">زر گالری</h1></div>
          <div className="sm:text-left"><strong>{order.invoice.invoiceNumber}</strong><br /><span className="text-sm text-[#747982]">{formatDate(order.invoice.issuedAt)}</span></div>
        </div>
        <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border border-[#e7e6e2] bg-[#fbfaf7] p-4"><span className="block text-xs text-[#747982]">شماره سفارش</span><strong>{order.orderNumber}</strong></div>
          <div className="border border-[#e7e6e2] bg-[#fbfaf7] p-4"><span className="block text-xs text-[#747982]">شناسه پرداخت</span><strong className="break-all">{successful?.referenceId ?? "—"}</strong></div>
        </div>
        <div className="overflow-x-auto border border-[#e7e6e2]">
          <table className="w-full min-w-[820px] border-collapse">
            <thead><tr>{["شرح", "وزن", "عیار", "تعداد", "اجرت", "سود", "مالیات", "جمع"].map((head) => <th className="border-b border-[#e7e6e2] bg-[#f8f7f4] px-3 py-3 text-right text-xs text-[#747982]" key={head}>{head}</th>)}</tr></thead>
            <tbody>
              {order.items.map((item: InvoiceItem) => <tr key={item.id}><td className={cell}>{item.name}<br /><span className="text-xs text-[#747982]">{item.sku}</span></td><td className={cell}>{Number(item.weightGrams)}</td><td className={cell}>{item.purity}</td><td className={cell}>{item.quantity}</td><td className={cell}>{formatMoney(item.makingFee.toString())}</td><td className={cell}>{formatMoney(item.profit.toString())}</td><td className={cell}>{formatMoney(item.tax.toString())}</td><td className={cell}>{formatMoney(item.total.toString())}</td></tr>)}
              <tr><td colSpan={7} className={cell}><strong>مبلغ قابل پرداخت</strong></td><td className={cell}><strong>{formatMoney(order.total.toString())}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p className="mb-0 mt-6 text-xs leading-7 text-[#747982]">نرخ مبنای طلای ۱۸ عیار در زمان ثبت سفارش: {formatMoney(order.goldPriceSnapshot.toString())}. این فاکتور پس از تأیید پرداخت صادر شده است.</p>
      </article>
    </main>
  );
}
