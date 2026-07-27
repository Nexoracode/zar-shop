import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";
import { Card, Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer } from "@/components/hero";
import { hasPermission } from "@/modules/auth/permissions";

type InvoiceOrder = Prisma.OrderGetPayload<{ include: { invoice: true; items: true; payments: true } }>;
type InvoiceItem = InvoiceOrder["items"][number];
type InvoicePayment = InvoiceOrder["payments"][number];

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser();
  const { orderId } = await params;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { invoice: true, items: true, payments: true } }) as InvoiceOrder | null;
  if (!order?.invoice) notFound();
  if (order.userId !== user.id && !hasPermission(user.role, "orders:manage")) redirect("/account");
  const successful = order.payments.find((payment: InvoicePayment) => payment.status === "SUCCESS");
  const cell = "border-b border-[#e7e6e2] px-3 py-3 text-sm";

  return (
    <main className="bg-[#f5f5f3] px-4 py-10 sm:px-6 sm:py-16">
      <Card variant="secondary" className="mx-auto max-w-[900px] rounded-2xl border border-[#e7e6e2] bg-white p-5 shadow-[0_16px_50px_rgba(20,35,61,0.06)] sm:p-9">
        <div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#e7e6e2] pb-6 sm:flex-row sm:items-start">
          <div><span className="text-xs font-bold text-[#785b27]">فاکتور رسمی فروش</span><h1 className="m-0 mt-1 text-3xl">زر گالری</h1></div>
          <div className="sm:text-left"><strong>{order.invoice.invoiceNumber}</strong><br /><span className="text-sm text-[#747982]">{formatDate(order.invoice.issuedAt)}</span></div>
        </div>
        <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border border-[#e7e6e2] bg-[#fbfaf7] p-4"><span className="block text-xs text-[#747982]">شماره سفارش</span><strong>{order.orderNumber}</strong></div>
          <div className="border border-[#e7e6e2] bg-[#fbfaf7] p-4"><span className="block text-xs text-[#747982]">شناسه پرداخت</span><strong className="break-all">{successful?.referenceId ?? "—"}</strong></div>
        </div>
        <Table><TableScrollContainer><TableContent aria-label="اقلام فاکتور" className="w-full min-w-[820px]"><TableHeader>{["شرح", "وزن", "عیار", "تعداد", "اجرت", "سود", "مالیات", "جمع"].map((head, index) => <TableColumn id={head} isRowHeader={index === 0} className="bg-[#f8f7f4] px-3 py-3 text-right text-xs text-[#747982]" key={head}>{head}</TableColumn>)}</TableHeader><TableBody>
          {order.items.map((item: InvoiceItem) => <TableRow id={item.id} key={item.id}><TableCell className={cell}>{item.name}<br /><span className="text-xs text-[#747982]">{item.sku}</span></TableCell><TableCell className={cell}>{Number(item.weightGrams)}</TableCell><TableCell className={cell}>{item.purity}</TableCell><TableCell className={cell}>{item.quantity}</TableCell><TableCell className={cell}>{formatMoney(item.makingFee.toString())}</TableCell><TableCell className={cell}>{formatMoney(item.profit.toString())}</TableCell><TableCell className={cell}>{formatMoney(item.tax.toString())}</TableCell><TableCell className={cell}>{formatMoney(item.total.toString())}</TableCell></TableRow>)}
          <TableRow id="total"><TableCell className={cell}><strong>مبلغ قابل پرداخت</strong></TableCell>{Array.from({ length: 6 }).map((_, index) => <TableCell key={index} className={cell}>—</TableCell>)}<TableCell className={cell}><strong>{formatMoney(order.total.toString())}</strong></TableCell></TableRow>
        </TableBody></TableContent></TableScrollContainer></Table>
        <p className="mb-0 mt-6 text-xs leading-7 text-[#747982]">نرخ مبنای طلای ۱۸ عیار در زمان ثبت سفارش: {formatMoney(order.goldPriceSnapshot.toString())}. این فاکتور پس از تأیید پرداخت صادر شده است.</p>
      </Card>
    </main>
  );
}
