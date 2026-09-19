import Link from "next/link";
import { ArrowLeft, Clock, CreditCard, Eye, Globe, MapPin, MessageSquare, RotateCcw, Star, Users } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { DashboardAttention, DashboardInsights } from "@/modules/admin/dashboard-insights";
import { foldSlices, type CountSlice, type VisitorAnalytics } from "@/modules/analytics/visitor-stats";
import { BpBarChart } from "./ui/bar-chart";
import { BpBarList } from "./ui/bar-list";
import { BpKicker } from "./ui/card";
import { BpDonutChart, type BpDonutSlice } from "./ui/donut-chart";
import { BpProvinceMap } from "./ui/province-map";
import { BpTag } from "./ui/tag";

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative overflow-hidden ${className}`}>{children}</section>;
}

export function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid place-items-center px-5 py-12 text-center">
      <strong className="text-sm">{title}</strong>
      <span className="bp-muted mt-1 text-xs">{description}</span>
    </div>
  );
}

export function Kpi({ label, value, hint, icon: Icon, compact, live, growth }: { label: string; value: string; hint: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; compact?: boolean; live?: boolean; /** Percent change to show as a badge; `undefined` shows none, `null` shows a dash. */ growth?: number | null }) {
  return (
    <Panel className="p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <BpKicker>{label}</BpKicker>
        {live ? <span className="bp-live-dot mt-1.5 flex-none" aria-hidden /> : <Icon size={17} strokeWidth={1.5} className="flex-none text-[var(--bp-accent)]" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <strong className={`block min-w-0 truncate font-bold tracking-[-0.02em] ${compact ? "text-lg" : "text-[26px]"}`}>{value}</strong>
        {growth !== undefined && <GrowthBadge value={growth} />}
      </div>
      <p className="bp-muted mb-0 mt-1 truncate text-[11px]">{hint}</p>
    </Panel>
  );
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="bp-muted text-[11px]" title="دورهٔ قبل فروشی برای مقایسه نداشته است">—</span>;
  const tone = value > 0 ? "success" : value < 0 ? "danger" : "neutral";
  return <BpTag tone={tone}><span dir="ltr">{value > 0 ? "+" : ""}{value.toLocaleString("fa-IR")}٪</span></BpTag>;
}

const chartPalette = ["var(--bp-accent)", "var(--bp-warning)", "var(--bp-success)", "var(--bp-danger)", "var(--bp-info)", "var(--bp-muted)"];
const deviceLabels: Record<string, string> = { MOBILE: "موبایل (Mobile)", DESKTOP: "رایانه (Desktop)", TABLET: "تبلت (Tablet)" };
const paymentLabels: Record<string, string> = { zarinpal: "زرین‌پال", zibal: "زیبال", wallet: "کیف پول", mock: "درگاه آزمایشی" };

function toSlices(slices: CountSlice[], label: (key: string) => string, limit = 5): BpDonutSlice[] {
  const { top, rest } = foldSlices(slices, limit);
  const result = top.map((slice, index) => ({ label: label(slice.key), value: slice.count, color: chartPalette[index % chartPalette.length] }));
  return rest > 0 ? [...result, { label: "سایر", value: rest, color: "var(--bp-muted)" }] : result;
}

function DonutPanel({ kicker, title, icon: Icon, slices, centerLabel }: { kicker: string; title: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; slices: BpDonutSlice[]; centerLabel: string }) {
  return (
    <Panel className="p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BpKicker>{kicker}</BpKicker>
          <div className="bp-card-title mt-0.5">{title}</div>
        </div>
        <Icon size={17} strokeWidth={1.5} className="mt-0.5 flex-none text-[var(--bp-muted)]" />
      </div>
      <div className="mt-4">
        {slices.length ? <BpDonutChart ariaLabel={`نمودار ${kicker}`} data={slices} centerLabel={centerLabel} /> : <Empty title="هنوز دیتایی ثبت نشده" description="پس از اولین بازدید نمایش داده می‌شود." />}
      </div>
    </Panel>
  );
}

/** Traffic charts: the 14-day visits bar chart and the browser / device / source breakdowns. */
export function DashboardTraffic({ visitors }: { visitors: VisitorAnalytics }) {
  const hasTraffic = visitors.periodViews > 0;
  return (
    <>
      <Panel className="p-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <BpKicker>آمار بازدید</BpKicker>
            <div className="bp-card-title mt-0.5">بازدید صفحات و تعداد افراد در ۱۴ روز اخیر</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <BpTag tone="neutral">مجموع {visitors.periodDays.toLocaleString("fa-IR")} روز: {visitors.periodViews.toLocaleString("fa-IR")} بازدید</BpTag>
            <BpTag tone="info">{visitors.periodVisitors.toLocaleString("fa-IR")} نفر</BpTag>
          </div>
        </div>
        <div className="mt-4">
          {hasTraffic ? (
            <BpBarChart
              ariaLabel="نمودار بازدید و تعداد افراد در ۱۴ روز اخیر"
              series={[{ key: "views", label: "مشاهده صفحات", color: "var(--bp-warning)" }, { key: "visitors", label: "تعداد افراد", color: "var(--bp-accent)" }]}
              data={visitors.trend.map((point) => ({ label: point.label, values: { views: point.views, visitors: point.visitors } }))}
            />
          ) : <Empty title="هنوز بازدیدی ثبت نشده است" description="پس از بازدید مشتریان از فروشگاه، آمار ترافیک اینجا نمایش داده می‌شود." />}
        </div>
      </Panel>

      <div className="grid gap-2 lg:grid-cols-3">
        <DonutPanel kicker="مرورگرها" title={`سهم هر مرورگر در ${visitors.periodDays.toLocaleString("fa-IR")} روز اخیر`} icon={Globe} centerLabel="بازدید" slices={toSlices(visitors.browsers, (key) => key)} />
        <DonutPanel kicker="دستگاه‌ها" title="موبایل، رایانه و تبلت" icon={Users} centerLabel="بازدید" slices={toSlices(visitors.devices, (key) => deviceLabels[key] ?? key, 3)} />
        <DonutPanel kicker="منابع ترافیک ورودی" title="بازدیدکنندگان از کجا می‌آیند" icon={Eye} centerLabel="بازدید" slices={toSlices(visitors.sources, (key) => (key ? key : "مستقیم (Direct)"), 4)} />
      </div>
    </>
  );
}

/** Where orders come from and what sells: provinces, best sellers and payment methods for the last 30 days. */
export function DashboardSalesBreakdown({ insights, periodDays }: { insights: DashboardInsights; periodDays: number }) {
  const days = periodDays.toLocaleString("fa-IR");
  return (
    <>
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="p-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <BpKicker>نقشهٔ پراکندگی سفارش‌ها</BpKicker>
              <div className="bp-card-title mt-0.5">فروش به تفکیک استان در {days} روز اخیر</div>
            </div>
            <MapPin size={17} strokeWidth={1.5} className="mt-0.5 flex-none text-[var(--bp-muted)]" />
          </div>
          <div className="mt-4">
            {insights.provinces.length ? (
              <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
                <BpProvinceMap
                  ariaLabel="نقشهٔ استان‌های ایران بر اساس فروش"
                  data={insights.provinces.map((row) => ({ province: row.province, value: Number(row.revenue), valueLabel: formatMoney(row.revenue), hint: `${row.orders.toLocaleString("fa-IR")} سفارش` }))}
                />
                <BpBarList
                  ariaLabel="استان‌های پرفروش"
                  items={insights.provinces.slice(0, 8).map((row) => ({ label: row.province, value: Number(row.revenue), valueLabel: formatMoney(row.revenue), hint: `${row.orders.toLocaleString("fa-IR")} سفارش` }))}
                />
              </div>
            ) : <Empty title="هنوز سفارشی ثبت نشده است" description="نقشهٔ فروش استان‌ها پس از اولین سفارش موفق نمایش داده می‌شود." />}
          </div>
        </Panel>

        <Panel className="p-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <BpKicker>پرفروش‌ترین محصولات</BpKicker>
              <div className="bp-card-title mt-0.5">بر اساس تعداد فروش در {days} روز اخیر</div>
            </div>
            <Star size={17} strokeWidth={1.5} className="mt-0.5 flex-none text-[var(--bp-muted)]" />
          </div>
          <div className="mt-4">
            {insights.topProducts.length ? (
              <BpBarList
                ariaLabel="پرفروش‌ترین محصولات"
                color="var(--bp-success)"
                items={insights.topProducts.map((row) => ({ label: row.name, value: row.quantity, valueLabel: `${row.quantity.toLocaleString("fa-IR")} عدد`, hint: `درآمد ${formatMoney(row.revenue)}` }))}
              />
            ) : <Empty title="هنوز فروشی ثبت نشده است" description="محصولات پرفروش پس از اولین سفارش موفق نمایش داده می‌شوند." />}
          </div>
        </Panel>
      </div>
    </>
  );
}

export function DashboardPayments({ insights, periodDays }: { insights: DashboardInsights; periodDays: number }) {
  return (
    <DonutPanel
      kicker="روش‌های پرداخت"
      title={`پرداخت‌های موفق ${periodDays.toLocaleString("fa-IR")} روز اخیر`}
      icon={CreditCard}
      centerLabel="پرداخت"
      slices={toSlices(insights.payments.map((row) => ({ key: row.provider, count: row.count })), (key) => paymentLabels[key.toLowerCase()] ?? key)}
    />
  );
}

const attentionItems: Array<{ key: keyof DashboardAttention; label: string; href: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }> = [
  { key: "pendingReviews", label: "دیدگاه در انتظار تأیید", href: "/admin/reviews", icon: Star },
  { key: "openTickets", label: "تیکت باز", href: "/admin/tickets", icon: MessageSquare },
  { key: "pendingReturns", label: "درخواست مرجوعی", href: "/admin/returns", icon: RotateCcw },
  { key: "unresolvedMessages", label: "پیام تماس بی‌پاسخ", href: "/admin/contact-messages", icon: Clock },
];

/** The queues waiting on the viewer; renders nothing when their role owns none of them. */
export function DashboardAttentionPanel({ attention }: { attention: DashboardAttention }) {
  const visible = attentionItems.filter((item) => attention[item.key] !== null);
  if (!visible.length) return null;
  return (
    <Panel>
      <div className="border-b border-[var(--bp-divider)] px-[18px] py-4">
        <BpKicker>نیازمند اقدام</BpKicker>
        <p className="bp-muted m-0 text-[11px]">موارد منتظر بررسی شما</p>
      </div>
      <div>
        {visible.map(({ key, label, href, icon: Icon }) => {
          const count = attention[key] ?? 0;
          return (
            <Link key={key} href={href} className="flex items-center justify-between gap-3 border-b border-[var(--bp-row-line)] px-[18px] py-3 last:border-b-0 hover:bg-[var(--bp-row-hover)]">
              <span className="flex min-w-0 items-center gap-2.5 text-[13px]"><Icon size={16} strokeWidth={1.5} className="flex-none text-[var(--bp-muted)]" /><span className="truncate">{label}</span></span>
              <span className="flex flex-none items-center gap-2">
                <BpTag tone={count > 0 ? "warning" : "neutral"} withDot={count > 0}>{count.toLocaleString("fa-IR")}</BpTag>
                <ArrowLeft size={14} className="text-[var(--bp-muted)]" />
              </span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
