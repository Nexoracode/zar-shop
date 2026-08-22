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
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin-ui";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableContent,
  TableHeader,
  TableRow,
  TableScrollContainer,
  TruncatedTextTooltip,
} from "@/components/hero";
import { requirePermission } from "@/modules/auth/session";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";

export default async function AdminPage() {
  const actor = await requirePermission("dashboard:view");
  const isFullAdmin = actor.role === "ADMIN";
  const catalogSettings = await getCatalogSettings();
  const [activeProducts, customers, actionableOrders, revenue, recentOrders, lowStockProducts] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
    }),
    db.order.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.product.findMany({
      where: { status: "ACTIVE", stock: { lte: catalogSettings.catalogLowStockThreshold } },
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
  const visibleStats = isFullAdmin ? stats : stats.slice(0, 2);

  const shortcuts = [
    { href: "/admin/products/new", label: "ثبت محصول جدید", description: "مشخصات، قیمت‌گذاری و تصاویر", icon: PackagePlus },
    { href: "/admin/orders", label: "مدیریت سفارش‌ها", description: "پرداخت، آماده‌سازی و ارسال", icon: ShoppingBag },
    { href: "/admin/categories", label: "مدیریت دسته‌بندی", description: "دسته‌ها و زیردسته‌های فروشگاه", icon: FolderTree },
    { href: "/admin/media", label: "گالری رسانه", description: "تصاویر و ویدیوهای محصولات", icon: Images },
  ];
  const visibleShortcuts = isFullAdmin ? shortcuts : shortcuts.filter((item) => item.href === "/admin/orders");

  return (
    <>
      <AdminPageHeader
        eyebrow="مرکز عملیات فروشگاه"
        title="نمای کلی مدیریت"
        description="وضعیت فروش، سفارش‌ها و موجودی محصولات را یک‌جا دنبال کنید."
      />

      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isFullAdmin ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
        {visibleStats.map(({ label, value, hint, icon: Icon, tone, compact }) => (
          <Card key={label} variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-500">{label}</span>
                <strong className={`mt-2 block truncate font-bold tracking-[-0.03em] text-slate-900 ${compact ? "text-lg xl:text-base 2xl:text-lg" : "text-2xl"}`}>{value}</strong>
              </div>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={21} /></span>
            </div>
            <p className="mb-0 mt-3 truncate text-[0.7rem] text-slate-400">{hint}</p>
          </Card>
        ))}
      </div>

      <div className={`mt-6 grid gap-6 ${isFullAdmin ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]" : "grid-cols-1"}`}>
        <AdminPanel>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div><h2 className="m-0 text-base font-bold text-slate-800">آخرین سفارش‌ها</h2><p className="m-0 text-xs text-slate-400">جدیدترین فعالیت‌های خرید فروشگاه</p></div>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--warning)]">همه سفارش‌ها<ArrowLeft size={14} /></Link>
          </div>
          {recentOrders.length ? (
            <>
              <AdminBulkEditor entity="orders" entityLabel="سفارش" ids={recentOrders.map((order) => order.id)} actions={[{ value: "status:PROCESSING", label: "شروع آماده‌سازی سفارش‌های پرداخت‌شده" }, { value: "status:SHIPPED", label: "ثبت ارسال سفارش‌های در حال آماده‌سازی" }, { value: "status:DELIVERED", label: "ثبت تحویل سفارش‌های ارسال‌شده" }, { value: "status:CANCELLED", label: "لغو سفارش‌های پرداخت‌نشده" }]}><Table><TableScrollContainer><TableContent aria-label="آخرین سفارش‌ها" className="w-full min-w-[680px]"><TableHeader><TableColumn id="select" className="w-12 bg-slate-50/70 px-3 py-3 text-center"><span className="sr-only">انتخاب</span></TableColumn>{["شماره سفارش", "مشتری", "اقلام", "مبلغ", "وضعیت", "تاریخ"].map((title, index) => <TableColumn id={title} key={title} isRowHeader={index === 0} className="bg-slate-50/70 px-4 py-3 text-right text-[0.7rem] font-bold text-slate-500">{title}</TableColumn>)}</TableHeader><TableBody>{recentOrders.map((order) => {
                    const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email || order.user.phone || "کاربر بدون نام";
                    return <TableRow id={order.id} key={order.id} className="transition hover:bg-slate-50/60">
                      <TableCell className="w-12 px-3 py-3 text-center"><AdminBulkCheckbox id={order.id} label={`انتخاب سفارش ${order.orderNumber}`} /></TableCell>
                      <TableCell className="px-4 py-3 text-xs font-bold text-slate-700">{order.orderNumber}</TableCell>
                      <TableCell className="w-44 max-w-44 px-4 py-3"><TruncatedTextTooltip text={customerName} className="max-w-36 text-xs text-slate-600" /></TableCell>
                      <TableCell className="px-4 py-3 text-xs text-slate-500">{order._count.items.toLocaleString("fa-IR")}</TableCell>
                      <TableCell className="px-4 py-3 text-xs font-bold text-slate-700">{formatMoney(order.total.toString())}</TableCell>
                      <TableCell className="px-4 py-3"><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge></TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatDate(order.createdAt)}</TableCell>
                    </TableRow>;
                  })}</TableBody></TableContent></TableScrollContainer></Table></AdminBulkEditor>
              <div className="divide-y divide-slate-100 md:hidden">
                {recentOrders.map((order) => {
                  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email || order.user.phone || "کاربر بدون نام";
                  return <article key={order.id} className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block text-xs text-slate-700" dir="ltr">{order.orderNumber}</strong><span className="block truncate text-xs text-slate-400">{customerName}</span></div><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge></div>
                    <div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-700">{formatMoney(order.total.toString())}</span><span className="text-slate-400">{order._count.items.toLocaleString("fa-IR")} قلم · {formatDate(order.createdAt)}</span></div>
                  </article>;
                })}
              </div>
            </>
          ) : <AdminEmptyState title="هنوز سفارشی ثبت نشده است" description="سفارش‌های جدید در این قسمت نمایش داده می‌شوند." />}
        </AdminPanel>

        {isFullAdmin ? <div className="grid content-start gap-6">
          <AdminPanel>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600"><TriangleAlert size={18} /></span><div><h2 className="m-0 text-sm font-bold text-slate-800">هشدار موجودی</h2><p className="m-0 text-[0.68rem] text-slate-400">محصولات با موجودی {catalogSettings.catalogLowStockThreshold.toLocaleString("fa-IR")} عدد یا کمتر</p></div></div></div>
            {lowStockProducts.length ? <div className="divide-y divide-slate-100">{lowStockProducts.map((product) => <Link href={`/admin/products/${product.id}/edit`} key={product.id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5"><div className="min-w-0"><strong className="block truncate text-xs text-slate-700">{product.name}</strong><span className="text-[0.68rem] text-slate-400" dir="ltr">{product.sku}</span></div><AdminStatusBadge tone={product.stock === 0 ? "danger" : "warning"}>{product.stock === 0 ? "ناموجود" : `${product.stock.toLocaleString("fa-IR")} عدد`}</AdminStatusBadge></Link>)}</div> : <AdminEmptyState title="موجودی محصولات مناسب است" description="محصول کم‌موجودی وجود ندارد." />}
          </AdminPanel>

          <AdminPanel>
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="m-0 text-sm font-bold text-slate-800">دسترسی سریع</h2><p className="m-0 text-[0.68rem] text-slate-400">عملیات پرتکرار مدیریت فروشگاه</p></div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {visibleShortcuts.map(({ href, label, description, icon: Icon }) => <Link href={href} key={href} className="group rounded-xl border border-slate-100 p-3 transition hover:border-[var(--warning)]/50 hover:bg-[var(--warning)]/5"><span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-[var(--warning)]/15 group-hover:text-[var(--warning)]"><Icon size={18} /></span><strong className="block text-xs text-slate-700">{label}</strong><span className="mt-1 hidden text-[0.65rem] leading-5 text-slate-400 sm:block">{description}</span></Link>)}
            </div>
          </AdminPanel>
        </div> : null}
      </div>
    </>
  );
}
