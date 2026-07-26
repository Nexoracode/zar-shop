import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  CircleDollarSign,
  FolderTree,
  Images,
  PackagePlus,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin-ui";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";

export default async function AdminPage() {
  const [activeProducts, customers, actionableOrders, revenue, recentOrders, lowStockProducts] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
    }),
    db.order.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.product.findMany({
      where: { status: "ACTIVE", stock: { lte: 3 } },
      select: { id: true, name: true, sku: true, stock: true },
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      take: 6,
    }),
  ]);

  const stats = [
    {
      label: "مجموع فروش موفق",
      value: formatMoney(revenue._sum.total?.toString() ?? 0),
      hint: "سفارش‌های پرداخت‌شده و تکمیل‌شده",
      icon: CircleDollarSign,
      tone: "bg-emerald-50 text-emerald-700",
      compact: true,
    },
    {
      label: "سفارش نیازمند رسیدگی",
      value: actionableOrders.toLocaleString("fa-IR"),
      hint: "پرداخت‌شده یا در حال آماده‌سازی",
      icon: ShoppingBag,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "محصول منتشرشده",
      value: activeProducts.toLocaleString("fa-IR"),
      hint: "قابل مشاهده در فروشگاه",
      icon: Boxes,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "مشتری ثبت‌نام‌شده",
      value: customers.toLocaleString("fa-IR"),
      hint: "حساب‌های مشتری فعال و غیرفعال",
      icon: Users,
      tone: "bg-violet-50 text-violet-700",
    },
  ];

  const shortcuts = [
    { href: "/admin/products/new", label: "ثبت محصول جدید", description: "مشخصات، قیمت‌گذاری و تصاویر", icon: PackagePlus },
    { href: "/admin/orders", label: "مدیریت سفارش‌ها", description: "پرداخت، آماده‌سازی و ارسال", icon: ShoppingBag },
    { href: "/admin/categories", label: "مدیریت دسته‌بندی", description: "دسته‌ها و زیردسته‌های فروشگاه", icon: FolderTree },
    { href: "/admin/media", label: "گالری رسانه", description: "تصاویر و ویدیوهای محصولات", icon: Images },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="مرکز عملیات فروشگاه"
        title="نمای کلی مدیریت"
        description="وضعیت فروش، سفارش‌ها و موجودی محصولات را یک‌جا دنبال کنید."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon, tone, compact }) => (
          <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-500">{label}</span>
                <strong className={`mt-2 block truncate font-black tracking-[-0.03em] text-slate-900 ${compact ? "text-lg xl:text-base 2xl:text-lg" : "text-2xl"}`}>{value}</strong>
              </div>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={21} /></span>
            </div>
            <p className="mb-0 mt-3 truncate text-[0.7rem] text-slate-400">{hint}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <AdminPanel>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div><h2 className="m-0 text-base font-black text-slate-800">آخرین سفارش‌ها</h2><p className="m-0 text-xs text-slate-400">جدیدترین فعالیت‌های خرید فروشگاه</p></div>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-[#846325]">همه سفارش‌ها<ArrowLeft size={14} /></Link>
          </div>
          {recentOrders.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead><tr>{["شماره سفارش", "مشتری", "اقلام", "مبلغ", "وضعیت", "تاریخ"].map((title) => <th key={title} className="bg-slate-50/70 px-4 py-3 text-right text-[0.7rem] font-bold text-slate-400">{title}</th>)}</tr></thead>
                  <tbody>{recentOrders.map((order) => {
                    const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email;
                    return <tr key={order.id} className="border-t border-slate-100 transition hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-xs font-bold text-slate-700" dir="ltr">{order.orderNumber}</td>
                      <td className="max-w-40 truncate px-4 py-3 text-xs text-slate-600">{customerName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{order._count.items.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatMoney(order.total.toString())}</td>
                      <td className="px-4 py-3"><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatDate(order.createdAt)}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {recentOrders.map((order) => {
                  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email;
                  return <article key={order.id} className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block text-xs text-slate-700" dir="ltr">{order.orderNumber}</strong><span className="block truncate text-xs text-slate-400">{customerName}</span></div><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge></div>
                    <div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-700">{formatMoney(order.total.toString())}</span><span className="text-slate-400">{order._count.items.toLocaleString("fa-IR")} قلم · {formatDate(order.createdAt)}</span></div>
                  </article>;
                })}
              </div>
            </>
          ) : <AdminEmptyState title="هنوز سفارشی ثبت نشده است" description="سفارش‌های جدید در این قسمت نمایش داده می‌شوند." />}
        </AdminPanel>

        <div className="grid content-start gap-6">
          <AdminPanel>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600"><TriangleAlert size={18} /></span><div><h2 className="m-0 text-sm font-black text-slate-800">هشدار موجودی</h2><p className="m-0 text-[0.68rem] text-slate-400">محصولات با موجودی ۳ عدد یا کمتر</p></div></div></div>
            {lowStockProducts.length ? <div className="divide-y divide-slate-100">{lowStockProducts.map((product) => <Link href={`/admin/products/${product.id}/edit`} key={product.id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5"><div className="min-w-0"><strong className="block truncate text-xs text-slate-700">{product.name}</strong><span className="text-[0.68rem] text-slate-400" dir="ltr">{product.sku}</span></div><AdminStatusBadge tone={product.stock === 0 ? "danger" : "warning"}>{product.stock === 0 ? "ناموجود" : `${product.stock.toLocaleString("fa-IR")} عدد`}</AdminStatusBadge></Link>)}</div> : <AdminEmptyState title="موجودی محصولات مناسب است" description="محصول کم‌موجودی وجود ندارد." />}
          </AdminPanel>

          <AdminPanel>
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="m-0 text-sm font-black text-slate-800">دسترسی سریع</h2><p className="m-0 text-[0.68rem] text-slate-400">عملیات پرتکرار مدیریت فروشگاه</p></div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {shortcuts.map(({ href, label, description, icon: Icon }) => <Link href={href} key={href} className="group rounded-xl border border-slate-100 p-3 transition hover:border-[#dac69f] hover:bg-[#fffcf7]"><span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-[#f4ead8] group-hover:text-[#846325]"><Icon size={18} /></span><strong className="block text-xs text-slate-700">{label}</strong><span className="mt-1 hidden text-[0.65rem] leading-5 text-slate-400 sm:block">{description}</span></Link>)}
            </div>
          </AdminPanel>
        </div>
      </div>
    </>
  );
}
