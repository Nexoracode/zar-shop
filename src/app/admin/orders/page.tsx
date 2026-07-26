import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

type OrderRow = Prisma.OrderGetPayload<{ include: { user: true; _count: { select: { items: true } } } }>;

export default async function OrdersPage() {
  const orders = await db.order.findMany({ include: { user: true, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const cell = "border-b border-[#e7e6e2] px-4 py-3.5 text-sm";

  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">سفارش‌ها</h1>
        <span className="text-sm text-[#747982]">پیگیری پرداخت و اجرای سفارش</span>
      </div>
      <div className="overflow-x-auto border border-[#e7e6e2] bg-white">
        <table className="w-full min-w-[760px] border-collapse">
          <thead><tr>{["شماره", "مشتری", "اقلام", "مبلغ", "وضعیت", "تاریخ"].map((head) => <th className="border-b border-[#e7e6e2] bg-[#f8f7f4] px-4 py-3.5 text-right text-xs text-[#747982]" key={head}>{head}</th>)}</tr></thead>
          <tbody>
            {orders.map((order: OrderRow) => (
              <tr key={order.id} className="hover:bg-[#fbfaf7]">
                <td className={cell}>{order.orderNumber}</td><td className={cell}>{order.user.firstName} {order.user.lastName}</td>
                <td className={cell}>{order._count.items}</td><td className={cell}>{formatMoney(order.total.toString())}</td>
                <td className={cell}><span className="inline-block rounded-sm bg-[#efe5d1] px-2.5 py-1 text-xs text-[#785b27]">{order.status}</span></td>
                <td className={cell}>{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && <div className="py-12 text-center text-[#747982]">هنوز سفارشی ثبت نشده است.</div>}
      </div>
    </>
  );
}
