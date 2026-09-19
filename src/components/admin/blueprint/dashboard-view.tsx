import Link from "next/link";
import { ArrowLeft, Boxes, CircleDollarSign, Eye, FolderTree, Images, PackagePlus, Percent, ReceiptText, ShoppingBag, TrendingUp, TriangleAlert, UserPlus, Users } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels, orderStatusTones, type AdminTone } from "@/modules/admin/labels";
import { growthPercent, INSIGHT_PERIOD_DAYS } from "@/modules/admin/dashboard-insights";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import type { AdminDashboardData } from "@/components/admin/dashboard-data";
import { DashboardAttentionPanel, DashboardPayments, DashboardSalesBreakdown, DashboardTraffic, Empty, Kpi, Panel } from "./dashboard-analytics";
import { BpKicker } from "./ui/card";
import { BpDonutChart } from "./ui/donut-chart";
import { BpLineChart } from "./ui/line-chart";
import { BpTable, BpTd, BpTh } from "./ui/table";
import { BpTag } from "./ui/tag";

const toneColor: Record<AdminTone, string> = {
  neutral: "var(--bp-muted)",
  info: "var(--bp-info)",
  success: "var(--bp-success)",
  warning: "var(--bp-warning)",
  danger: "var(--bp-danger)",
  gold: "var(--bp-warning)",
};

type KpiItem = React.ComponentProps<typeof Kpi>;

function KpiGrid({ items, columns = 4 }: { items: KpiItem[]; columns?: 2 | 4 }) {
  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${columns === 4 ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
      {items.map((item) => <Kpi key={item.label} {...item} />)}
    </div>
  );
}

export function BlueprintDashboardView({ isFullAdmin, activeProducts, customers, actionableOrders, revenueTotal, lowStockThreshold, recentOrders, lowStockProducts, salesTrend, orderStatusBreakdown, visitors, insights, conversion, attention }: AdminDashboardData) {
  const days = INSIGHT_PERIOD_DAYS.toLocaleString("fa-IR");
  const totalRevenueKpi: KpiItem = { label: "مجموع فروش موفق", value: formatMoney(revenueTotal), hint: "سفارش‌های پرداخت‌شده و تکمیل‌شده", icon: CircleDollarSign, compact: true };
  const actionableKpi: KpiItem = { label: "سفارش نیازمند رسیدگی", value: actionableOrders.toLocaleString("fa-IR"), hint: "پرداخت‌شده یا در حال آماده‌سازی", icon: ShoppingBag };

  const visitorKpis: KpiItem[] = visitors ? [
    { label: "کاربران آنلاین", value: visitors.online.toLocaleString("fa-IR"), hint: "فعال در ۵ دقیقهٔ اخیر", icon: Users, live: true },
    { label: "بازدید امروز", value: visitors.todayViews.toLocaleString("fa-IR"), hint: "کل صفحات مشاهده‌شده", icon: Eye },
    { label: "افراد امروز", value: visitors.todayVisitors.toLocaleString("fa-IR"), hint: "بازدیدکنندگان یکتا", icon: Users },
    { label: "نرخ تبدیل", value: conversion === null ? "—" : `${conversion.toLocaleString("fa-IR")}٪`, hint: `سفارش موفق به بازدیدکننده در ${days} روز اخیر`, icon: Percent },
  ] : [];

  const salesKpis: KpiItem[] = insights ? [
    { label: "فروش امروز", value: formatMoney(insights.todayRevenue), hint: `${insights.todayOrders.toLocaleString("fa-IR")} سفارش موفق`, icon: CircleDollarSign, compact: true },
    { label: `فروش ${days} روز اخیر`, value: formatMoney(insights.periodRevenue), hint: `نسبت به ${days} روز قبل از آن`, icon: TrendingUp, compact: true, growth: growthPercent(Number(insights.periodRevenue), Number(insights.previousPeriodRevenue)) },
    { label: "میانگین ارزش سفارش", value: formatMoney(insights.periodOrders > 0 ? Math.round(Number(insights.periodRevenue) / insights.periodOrders).toString() : "0"), hint: `${insights.periodOrders.toLocaleString("fa-IR")} سفارش در ${days} روز اخیر`, icon: ReceiptText, compact: true },
    totalRevenueKpi,
  ] : [];

  const overviewKpis: KpiItem[] = [
    actionableKpi,
    { label: "محصول منتشرشده", value: activeProducts.toLocaleString("fa-IR"), hint: "قابل مشاهده در فروشگاه", icon: Boxes },
    { label: "مشتری ثبت‌نام‌شده", value: customers.toLocaleString("fa-IR"), hint: "حساب‌های مشتری فعال و غیرفعال", icon: Users },
    { label: "مشتری جدید", value: (insights?.newCustomers ?? 0).toLocaleString("fa-IR"), hint: `ثبت‌نام در ${days} روز اخیر`, icon: UserPlus },
  ];

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

      {isFullAdmin && visitors && (
        <section className="grid gap-2" aria-label="آمار بازدید فروشگاه">
          <KpiGrid items={visitorKpis} />
          <DashboardTraffic visitors={visitors} />
        </section>
      )}

      {isFullAdmin ? (
        <section className="grid gap-2" aria-label="آمار فروش">
          <KpiGrid items={salesKpis} />
          <KpiGrid items={overviewKpis} />
        </section>
      ) : <KpiGrid columns={2} items={[totalRevenueKpi, actionableKpi]} />}

      {isFullAdmin && (
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
          <Panel className="p-[18px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <BpKicker>روند فروش</BpKicker>
                <div className="bp-card-title mt-0.5">مجموع فروش موفق در ۱۴ روز اخیر</div>
              </div>
            </div>
            <div className="mt-4">
              {salesTrend.some((point) => Number(point.total) > 0) ? (
                <BpLineChart
                  ariaLabel="نمودار روند فروش ۱۴ روز اخیر"
                  data={salesTrend.map((point) => ({ label: point.label, value: Number(point.total) }))}
                  money
                  valueLabel="فروش"
                />
              ) : <Empty title="هنوز فروشی ثبت نشده است" description="روند فروش پس از اولین سفارش موفق نمایش داده می‌شود." />}
            </div>
          </Panel>

          <Panel className="p-[18px]">
            <BpKicker>توزیع وضعیت سفارش‌ها</BpKicker>
            <div className="bp-card-title mt-0.5">سهم هر وضعیت از کل سفارش‌ها</div>
            <div className="mt-4">
              {orderStatusBreakdown.length ? (
                <BpDonutChart
                  ariaLabel="نمودار توزیع وضعیت سفارش‌ها"
                  categoryLabel="وضعیت"
                  data={orderStatusBreakdown.map((group) => ({ label: orderStatusLabels[group.status], value: group.count, color: toneColor[orderStatusTones[group.status]] }))}
                />
              ) : <Empty title="هنوز سفارشی ثبت نشده است" description="توزیع وضعیت پس از ثبت اولین سفارش نمایش داده می‌شود." />}
            </div>
          </Panel>
        </div>
      )}

      {isFullAdmin && insights ? (
        <section className="grid gap-2" aria-label="پراکندگی و پرفروش‌ها">
          <DashboardSalesBreakdown insights={insights} periodDays={INSIGHT_PERIOD_DAYS} />
          <div className="grid gap-2 xl:grid-cols-2">
            <DashboardPayments insights={insights} periodDays={INSIGHT_PERIOD_DAYS} />
            <DashboardAttentionPanel attention={attention} />
          </div>
        </section>
      ) : <DashboardAttentionPanel attention={attention} />}

      <div className={`grid gap-2 ${isFullAdmin ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]" : "grid-cols-1"}`}>
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
          <div className="grid content-start gap-2">
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
