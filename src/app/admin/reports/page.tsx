import { Suspense } from "react";
import { CircleDollarSign, Receipt, ShoppingBag, UserPlus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { BpKicker } from "@/components/admin/blueprint/ui/card";
import { BpLineChart } from "@/components/admin/blueprint/ui/line-chart";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { formatMoney } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { DEFAULT_REPORT_RANGE, resolveReportPeriod, type ReportPeriod } from "@/modules/reports/report-range";
import { getSalesReport, type SalesReport } from "@/modules/reports/sales-report";
import { ExportCsvButton } from "./export-csv-button";
import { ReportSkeleton } from "./report-skeleton";
import { ReportsFilterBar } from "./reports-filter-bar";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

const faInt = (value: number) => Math.round(value).toLocaleString("fa-IR");
const faPercent = (value: number) => `${value.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("reports:view");
  const params = await searchParams;
  const period = resolveReportPeriod(params);
  const activeRange = period.range ?? DEFAULT_REPORT_RANGE;
  const customFrom = period.custom ? params.from ?? null : null;
  const customTo = period.custom ? params.to ?? null : null;
  const exportParams = period.custom
    ? { from: customFrom as string, to: customTo as string }
    : { range: activeRange };

  return (
    <>
      <AdminPageHeader
        eyebrow="گزارش‌ها"
        title="گزارش مالی"
        description="فروش، سفارش‌ها و پرفروش‌ترین محصولات و دسته‌بندی‌ها را در بازه دلخواه ببینید."
        action={<ExportCsvButton params={exportParams} />}
      />

      <section className="bp-frame relative mb-2">
        <ReportsFilterBar range={activeRange} from={customFrom} to={customTo} />
      </section>

      <Suspense key={period.custom ? `${customFrom}:${customTo}` : activeRange} fallback={<ReportSkeleton />}>
        <ReportContent period={period} />
      </Suspense>
    </>
  );
}

async function ReportContent({ period }: { period: ReportPeriod }) {
  const report = await getSalesReport(period);
  return <ReportBody report={report} />;
}

function ReportBody({ report }: { report: SalesReport }) {
  const { kpis, dailySales, topProducts, topCategories } = report;
  const hasSales = dailySales.some((point) => point.revenue > 0);
  const kpiCards = [
    { label: "مجموع فروش", value: formatMoney(kpis.totalRevenue), hint: "سفارش‌های پرداخت‌شده و تکمیل‌شده", icon: CircleDollarSign, compact: true },
    { label: "تعداد سفارش", value: faInt(kpis.orderCount), hint: "در بازه انتخاب‌شده", icon: ShoppingBag, compact: false },
    { label: "میانگین ارزش سفارش", value: formatMoney(Math.round(kpis.averageOrderValue)), hint: "مجموع فروش تقسیم بر تعداد سفارش", icon: Receipt, compact: true },
    { label: "مشتری جدید", value: faInt(kpis.newCustomers), hint: "حساب‌های مشتری ساخته‌شده در بازه", icon: UserPlus, compact: false },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ label, value, hint, icon: Icon, compact }) => (
          <section key={label} className="bp-frame relative p-[18px]">
            <div className="flex items-start justify-between gap-3">
              <BpKicker>{label}</BpKicker>
              <Icon size={17} strokeWidth={1.5} className="flex-none text-[var(--bp-accent)]" />
            </div>
            <strong className={`mt-2 block truncate font-bold tracking-[-0.02em] ${compact ? "text-lg" : "text-[26px]"}`}>{value}</strong>
            <p className="bp-muted mb-0 mt-1 truncate text-[11px]">{hint}</p>
          </section>
        ))}
      </div>

      <section className="bp-frame relative p-[18px]">
        <BpKicker>روند فروش روزانه</BpKicker>
        <div className="bp-card-title mt-0.5">مبلغ فروش موفق به تفکیک روز</div>
        <div className="mt-4">
          {hasSales ? (
            <BpLineChart
              ariaLabel="نمودار روند فروش روزانه"
              data={dailySales.map((point) => ({ label: point.label, value: point.revenue }))}
              money
            />
          ) : (
            <div className="grid place-items-center px-5 py-12 text-center">
              <strong className="text-sm">فروشی در این بازه ثبت نشده است</strong>
              <span className="bp-muted mt-1 text-xs">با تغییر بازه زمانی، روند فروش این‌جا نمایش داده می‌شود.</span>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-2 lg:grid-cols-2">
        <section className="bp-frame relative overflow-hidden">
          <div className="border-b border-[var(--bp-divider)] px-[18px] py-4">
            <BpKicker>پرفروش‌ترین محصولات</BpKicker>
            <p className="bp-muted m-0 text-[11px]">۱۰ محصول با بیشترین تعداد فروش در بازه</p>
          </div>
          {topProducts.length ? (
            <BpTable ariaLabel="پرفروش‌ترین محصولات" minWidth={420}>
              <thead>
                <tr>
                  <BpTh className="w-12">ردیف</BpTh>
                  <BpTh>نام محصول</BpTh>
                  <BpTh>SKU</BpTh>
                  <BpTh>تعداد فروخته‌شده</BpTh>
                  <BpTh>درآمد</BpTh>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={product.productId}>
                    <BpTd className="bp-muted font-bold">{faInt(index + 1)}</BpTd>
                    <BpTd className="max-w-52 truncate text-[13px]">{product.name}</BpTd>
                    <BpTd className="text-[13px]"><span dir="ltr">{product.sku}</span></BpTd>
                    <BpTd className="text-[13px]">{faInt(product.quantity)}</BpTd>
                    <BpTd className="whitespace-nowrap text-[13px] font-bold">{formatMoney(product.revenue)}</BpTd>
                  </tr>
                ))}
              </tbody>
            </BpTable>
          ) : (
            <EmptyRows text="فروش محصولی در این بازه ثبت نشده است." />
          )}
        </section>

        <section className="bp-frame relative overflow-hidden">
          <div className="border-b border-[var(--bp-divider)] px-[18px] py-4">
            <BpKicker>پردرآمدترین دسته‌بندی‌ها</BpKicker>
            <p className="bp-muted m-0 text-[11px]">۵ دسته با بیشترین درآمد در بازه</p>
          </div>
          {topCategories.length ? (
            <BpTable ariaLabel="پردرآمدترین دسته‌بندی‌ها" minWidth={360}>
              <thead>
                <tr>
                  <BpTh className="w-12">ردیف</BpTh>
                  <BpTh>نام دسته</BpTh>
                  <BpTh>درآمد</BpTh>
                  <BpTh>سهم درصدی</BpTh>
                </tr>
              </thead>
              <tbody>
                {topCategories.map((category, index) => (
                  <tr key={category.categoryId ?? "none"}>
                    <BpTd className="bp-muted font-bold">{faInt(index + 1)}</BpTd>
                    <BpTd className="max-w-52 truncate text-[13px]">{category.name}</BpTd>
                    <BpTd className="whitespace-nowrap text-[13px] font-bold">{formatMoney(category.revenue)}</BpTd>
                    <BpTd className="text-[13px]">{faPercent(category.share)}</BpTd>
                  </tr>
                ))}
              </tbody>
            </BpTable>
          ) : (
            <EmptyRows text="درآمدی برای دسته‌بندی‌ها در این بازه ثبت نشده است." />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyRows({ text }: { text: string }) {
  return (
    <div className="grid place-items-center px-5 py-10 text-center">
      <span className="bp-muted text-xs">{text}</span>
    </div>
  );
}
