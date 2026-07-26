import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function AdminPage() {
  const [products, orders, users, revenue] = await Promise.all([
    db.product.count(),
    db.order.count(),
    db.user.count(),
    db.order.aggregate({ _sum: { total: true }, where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } }),
  ]);

  const stats = [
    { val: products.toLocaleString("fa-IR"), label: "محصول" },
    { val: orders.toLocaleString("fa-IR"), label: "سفارش" },
    { val: users.toLocaleString("fa-IR"), label: "کاربر" },
    { val: formatMoney(revenue._sum.total?.toString() ?? 0), label: "فروش موفق", small: true },
  ];

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-5">
        <div>
          <span className="inline-block text-[#785b27] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">امروز در فروشگاه</span>
          <h1 className="m-0 text-2xl sm:text-3xl">نمای کلی</h1>
        </div>
      </div>
      <div className="mt-[22px] grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-[14px]">
        {stats.map(({ val, label, small }) => (
          <div key={label} className="min-w-0 rounded-[4px] border border-[#e7e6e2] bg-white p-4 sm:p-[21px]">
            <strong className={`block font-bold ${small ? "text-[1rem]" : "text-2xl"}`}>{val}</strong>
            <span className="text-[#747982] text-[0.85rem]">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
