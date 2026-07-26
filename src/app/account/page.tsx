import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import type { Order } from "@generated/prisma/client";

export default async function AccountPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  const displayName = user.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user.email;

  return (
    <main className="px-5 py-12 sm:px-6 sm:py-[86px]">
      <div className="mx-auto w-full max-w-[1240px]">
        {/* Panel head */}
        <div className="mb-6 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <span className="inline-block text-[#785b27] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">حساب مشتری</span>
            <h1 className="mt-0 mb-0">{displayName}</h1>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center border border-[#17233b] rounded-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)]">
              خروج
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="mt-[22px] grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-[14px]">
          {[
            { val: orders.length.toLocaleString("fa-IR"), label: "سفارش ثبت‌شده" },
            { val: orders.filter((o: Order) => o.status === "DELIVERED").length.toLocaleString("fa-IR"), label: "تحویل‌شده" },
            { val: user.phone ?? "—", label: "شماره تماس" },
            { val: user.email, label: "ایمیل حساب", small: true },
          ].map(({ val, label, small }) => (
            <div key={label} className="p-[21px] border border-[#e7e6e2] bg-white rounded-[4px]">
              <strong className={`block font-bold ${small ? "text-[1rem]" : "text-2xl"}`}>{val}</strong>
              <span className="text-[#747982] text-[0.85rem]">{label}</span>
            </div>
          ))}
        </div>

        {/* Orders */}
        <div className="flex items-end justify-between gap-6 mt-[45px] mb-[34px]">
          <h2 className="m-0">سفارش‌های من</h2>
        </div>

        <div className="border border-[#e7e6e2] bg-white overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                {["شماره سفارش", "مبلغ", "وضعیت", "تاریخ"].map((h) => (
                  <th key={h} className="px-4 py-[14px] text-right border-b border-[#e7e6e2] text-[#747982] text-[0.82rem] bg-[#f8f7f4]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o: Order) => (
                <tr key={o.id}>
                  <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{o.orderNumber}</td>
                  <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{formatMoney(o.total.toString())}</td>
                  <td className="px-4 py-[14px] border-b border-[#e7e6e2]">
                    <span className="inline-block px-[11px] py-[5px] bg-[#efe5d1] text-[#785b27] text-[0.78rem] rounded-sm">{o.status}</span>
                  </td>
                  <td className="px-4 py-[14px] border-b border-[#e7e6e2]">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr><td colSpan={4} className="py-12 text-center text-[#747982]">هنوز سفارشی ندارید.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
