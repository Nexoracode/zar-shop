import Link from "next/link";
import { ArrowLeft, Boxes, CircleDollarSign, FolderTree, Images, PackagePlus, ShoppingBag, TriangleAlert, Users } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import type { AdminDashboardData } from "@/components/admin/dashboard-data";
import { BpKicker } from "./ui/card";
import { BpTable, BpTd, BpTh } from "./ui/table";
import { BpTag } from "./ui/tag";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`}>{children}</section>;
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid place-items-center px-5 py-12 text-center">
      <strong className="text-sm">{title}</strong>
      <span className="bp-muted mt-1 text-xs">{description}</span>
    </div>
  );
}

export function BlueprintDashboardView({ isFullAdmin, activeProducts, customers, actionableOrders, revenueTotal, lowStockThreshold, recentOrders, lowStockProducts }: AdminDashboardData) {
  const kpis = [
    { label: "مجموع فروش موفق", value: formatMoney(revenueTotal), hint: "سفارش‌های پرداخت‌شده و تکمیل‌شده", icon: CircleDollarSign, compact: true },
    { label: "سفارش نیازمند رسیدگی", value: actionableOrders.toLocaleString("fa-IR"), hint: "پرداخت‌شده یا در حال آماده‌سازی", icon: ShoppingBag },
    { label: "محصول منتشرشده", value: activeProducts.toLocaleString("fa-IR"), hint: "قابل مشاهده در فروشگاه", icon: Boxes },
    { label: "مشتری ثبت‌نام‌شده", value: customers.toLocaleString("fa-IR"), hint: "حساب‌های مشتری فعال و غیرفعال", icon: Users },
  ];
  const visibleKpis = isFullAdmin ? kpis : kpis.slice(0, 2);

  const shortcuts = [
    { href: "/admin/products/new", label: "ثبت محصول جدید", description: "مشخصات، قیمت‌گذاری و تصاویر", icon: PackagePlus },
    { href: "/admin/orders", label: "مدیریت سفارش‌ها", description: "پرداخت، آماده‌سازی و ارسال", icon: ShoppingBag },
    { href: "/admin/categories", label: "مدیریت دسته‌بندی", description: "دسته‌ها و زیردسته‌های فروشگاه", icon: FolderTree },
    { href: "/admin/media", label: "گالری رسانه", description: "تصاویر و ویدیوهای محصولات", icon: Images },
  ];
  const visibleShortcuts = isFullAdmin ? shortcuts : shortcuts.filter((item) => item.href === "/admin/orders");

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-[var(--bp-divider)] pb-5">
        <BpKicker>مرکز عملیات فروشگاه</BpKicker>
        <h2 className="mt-1">نمای کلی مدیریت</h2>
        <p className="bp-muted mb-0 mt-1 max-w-2xl text-[13px]">وضعیت فروش، سفارش‌ها و موجودی محصولات را یک‌جا دنبال کنید.</p>
      </header>

      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isFullAdmin ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
        {visibleKpis.map(({ label, value, hint, icon: Icon, compact }) => (
          <Panel key={label} className="p-[18px]">
            <div className="flex items-start justify-between gap-3">
              <BpKicker>{label}</BpKicker>
              <Icon size={17} strokeWidth={1.5} className="flex-none text-[var(--bp-accent)]" />
            </div>
            <strong className={`mt-2 block truncate font-bold tracking-[-0.02em] ${compact ? "text-lg" : "text-[26px]"}`}>{value}</strong>
            <p className="bp-muted mb-0 mt-1 truncate text-[11px]">{hint}</p>
          </Panel>
        ))}
      </div>

      <div className={`grid gap-3 ${isFullAdmin ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]" : "grid-cols-1"}`}>
        <Panel>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--bp-divider)] px-[18px] py-4">
            <div>
              <BpKicker>آخرین سفارش‌ها</BpKicker>
              <div className="bp-card-title mt-0.5">جدیدترین فعالیت‌های خرید فروشگاه</div>
            </div>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--bp-accent)]">همه سفارش‌ها<ArrowLeft size={14} /></Link>
          </div>
          {recentOrders.length ? (
            <>
              {/* AdminBulkEditor already hides its own desktop wrapper below md. */}
              <AdminBulkEditor
                entity="orders"
                entityLabel="سفارش"
                ids={recentOrders.map((order) => order.id)}
                actions={[
                  { value: "status:PROCESSING", label: "شروع آماده‌سازی سفارش‌های پرداخت‌شده" },
                  { value: "status:SHIPPED", label: "ثبت ارسال سفارش‌های در حال آماده‌سازی" },
                  { value: "status:DELIVERED", label: "ثبت تحویل سفارش‌های ارسال‌شده" },
                  { value: "status:CANCELLED", label: "لغو سفارش‌های پرداخت‌نشده" },
                ]}
                >
                <BpTable ariaLabel="آخرین سفارش‌ها" minWidth={680}>
                  <thead>
                    <tr>
                      <BpTh className="w-12 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh>شماره سفارش</BpTh>
                      <BpTh>مشتری</BpTh>
                      <BpTh>اقلام</BpTh>
                      <BpTh>مبلغ</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh>تاریخ</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <BpTd className="w-12 text-center"><AdminBulkCheckbox id={order.id} label={`انتخاب سفارش ${order.orderNumber}`} /></BpTd>
                        <BpTd className="text-[13px] font-bold"><span dir="ltr">{order.orderNumber}</span></BpTd>
                        <BpTd className="max-w-44 truncate text-[13px]">{order.customerName}</BpTd>
                        <BpTd className="bp-muted text-[13px]">{order.itemCount.toLocaleString("fa-IR")}</BpTd>
                        <BpTd className="text-[13px] font-bold">{formatMoney(order.total)}</BpTd>
                        <BpTd><BpTag tone={orderStatusTones[order.status]} withDot>{orderStatusLabels[order.status]}</BpTag></BpTd>
                        <BpTd className="bp-muted whitespace-nowrap text-[13px]">{formatDate(order.createdAt)}</BpTd>
                      </tr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
              <div className="md:hidden">
                {recentOrders.map((order) => (
                  <article key={order.id} className="grid gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-[13px]" dir="ltr">{order.orderNumber}</strong>
                        <span className="bp-muted block truncate text-xs">{order.customerName}</span>
                      </div>
                      <BpTag tone={orderStatusTones[order.status]} withDot>{orderStatusLabels[order.status]}</BpTag>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold">{formatMoney(order.total)}</span>
                      <span className="bp-muted">{order.itemCount.toLocaleString("fa-IR")} قلم · {formatDate(order.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : <Empty title="هنوز سفارشی ثبت نشده است" description="سفارش‌های جدید در این قسمت نمایش داده می‌شوند." />}
        </Panel>

        {isFullAdmin && (
          <div className="grid content-start gap-3">
            <Panel>
              <div className="flex items-center gap-2.5 border-b border-[var(--bp-divider)] px-[18px] py-4">
                <span className="flex h-9 w-9 flex-none items-center justify-center border border-[var(--bp-divider)] text-[var(--bp-danger)]"><TriangleAlert size={17} strokeWidth={1.5} /></span>
                <div>
                  <BpKicker>هشدار موجودی</BpKicker>
                  <p className="bp-muted m-0 text-[11px]">محصولات با موجودی {lowStockThreshold.toLocaleString("fa-IR")} عدد یا کمتر</p>
                </div>
              </div>
              {lowStockProducts.length ? (
                <div>
                  {lowStockProducts.map((product) => (
                    <Link key={product.id} href={`/admin/products/${product.id}/edit`} className="flex items-center justify-between gap-3 border-b border-[var(--bp-row-line)] px-[18px] py-3 last:border-b-0 hover:bg-[var(--bp-row-hover)]">
                      <div className="min-w-0">
                        <strong className="block truncate text-[13px]">{product.name}</strong>
                        <span className="bp-muted text-[11px]" dir="ltr">{product.sku}</span>
                      </div>
                      <BpTag tone={product.stock === 0 ? "danger" : "warning"} withDot>{product.stock === 0 ? "ناموجود" : `${product.stock.toLocaleString("fa-IR")} عدد`}</BpTag>
                    </Link>
                  ))}
                </div>
              ) : <Empty title="موجودی محصولات مناسب است" description="محصول کم‌موجودی وجود ندارد." />}
            </Panel>

            <Panel>
              <div className="border-b border-[var(--bp-divider)] px-[18px] py-4">
                <BpKicker>دسترسی سریع</BpKicker>
                <p className="bp-muted m-0 text-[11px]">عملیات پرتکرار مدیریت فروشگاه</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                {visibleShortcuts.map(({ href, label, description, icon: Icon }) => (
                  <Link key={href} href={href} className="group border border-[var(--bp-divider)] p-3 transition hover:border-[var(--bp-accent)] hover:bg-[var(--bp-accent-100)]">
                    <Icon size={18} strokeWidth={1.5} className="mb-3 text-[var(--bp-accent)]" />
                    <strong className="block text-[13px]">{label}</strong>
                    <span className="bp-muted mt-1 hidden text-[11px] leading-5 sm:block">{description}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
