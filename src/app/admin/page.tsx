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
      <div className="flex justify-between items-center gap-5 mb-6">
        <div>
          <span className="inline-block text-[#785b27] text-[0.78rem] font-bold tracking-[0.03em] mb-[5px]">امروز در فروشگاه</span>
          <h1 className="mt-0 mb-0">نمای کلی</h1>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-[14px] mt-[22px] max-[760px]:grid-cols-2">
        {stats.map(({ val, label, small }) => (
          <div key={label} className="p-[21px] border border-[#e7e6e2] bg-white rounded-[4px]">
            <strong className={`block font-bold ${small ? "text-[1rem]" : "text-2xl"}`}>{val}</strong>
            <span className="text-[#747982] text-[0.85rem]">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
