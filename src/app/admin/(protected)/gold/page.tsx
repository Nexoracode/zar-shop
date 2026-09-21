import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, Coins, Gauge, Settings2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { BpKicker } from "@/components/admin/blueprint/ui/card";
import { BpLineChart } from "@/components/admin/blueprint/ui/line-chart";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag, type BpTagTone } from "@/components/admin/blueprint/ui/tag";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { GoldPriceRefreshButton } from "./gold-price-refresh-button";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const shortStamp = (value: Date) => new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);

type CacheState = { tone: BpTagTone; label: string };

function resolveCacheState(fetchedAt: Date | null, cacheSeconds: number, fallbackMinutes: number): CacheState {
  if (!fetchedAt) return { tone: "danger", label: "نرخ در دسترس نیست" };
  const ageMs = Date.now() - fetchedAt.getTime();
  if (ageMs < cacheSeconds * 1000) return { tone: "success", label: "به‌روز" };
  if (ageMs < fallbackMinutes * 60_000) return { tone: "warning", label: "از کش fallback" };
  return { tone: "danger", label: "منقضی‌شده" };
}

const GOLD_PRICES_TABLE_ID = "goldPrices";

const goldPriceColumns = [
  { id: "price", label: "نرخ" },
  { id: "source", label: "منبع" },
  { id: "fetchedAt", label: "زمان دریافت" },
];

type SearchParams = Promise<{ source?: string }>;

export default async function AdminGoldPricePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("catalog:manage");
  if ((await getStoreIndustry()) !== "GOLD") notFound();

  const params = await searchParams;
  const [history, settings, initialHiddenColumns] = await Promise.all([
    db.goldPrice.findMany({ orderBy: { fetchedAt: "desc" }, take: 48 }),
    getCatalogSettings(),
    readHiddenColumns(GOLD_PRICES_TABLE_ID),
  ]);
  // The chart always plots every record; only the table below is narrowed by the source filter.
  const sources = [...new Set(history.map((row) => row.source))];
  const source = sources.includes(params.source ?? "") ? (params.source as string) : "";
  const rows = source ? history.filter((row) => row.source === source) : history;
  const latest = history[0] ?? null;
  const cacheState = resolveCacheState(latest?.fetchedAt ?? null, settings.goldPriceCacheSeconds, settings.goldPriceFallbackMinutes);
  const chartData = [...history].reverse().map((row) => ({ label: shortStamp(row.fetchedAt), value: Number(row.pricePerGram18) }));

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader
        flush
        title="داشبورد نرخ طلا"
        description="آخرین نرخ دریافت‌شده، منبع، و تاریخچه ۴۸ رکورد اخیر"
      />

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="bp-frame relative p-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="grid size-11 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><Coins size={19} /></span>
              <span>
                <BpKicker>نرخ هر گرم طلای ۱۸ عیار</BpKicker>
                <strong className="mt-1 block text-[26px] font-bold tracking-[-0.02em]">{latest ? formatMoney(latest.pricePerGram18.toString()) : "نامشخص"}</strong>
              </span>
            </span>
            <BpTag tone={cacheState.tone} withDot>{cacheState.label}</BpTag>
          </div>
          <dl className="mt-4 grid gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="bp-muted block text-[11px] font-bold">منبع دریافت</dt>
              <dd dir="ltr" className="mt-1 block truncate text-right font-mono text-[12px] font-bold">{latest?.source ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="bp-muted block text-[11px] font-bold">آخرین دریافت</dt>
              <dd className="mt-1 block text-[13px] font-bold">{latest ? formatDateTime(latest.fetchedAt) : "—"}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <GoldPriceRefreshButton />
          </div>
        </section>

        <section className="bp-frame relative p-[18px]">
          <div className="mb-3 flex items-center gap-2"><Settings2 size={16} className="text-[var(--bp-accent)]" /><div role="heading" aria-level={2} className="text-[13px] font-bold">تنظیمات کش نرخ</div></div>
          <dl className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <dt className="bp-muted text-[12px]">مدت اعتبار کش</dt>
              <dd className="text-[13px] font-bold">{settings.goldPriceCacheSeconds.toLocaleString("fa-IR")} ثانیه</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="bp-muted text-[12px]">مدت اعتبار fallback</dt>
              <dd className="text-[13px] font-bold">{settings.goldPriceFallbackMinutes.toLocaleString("fa-IR")} دقیقه</dd>
            </div>
          </dl>
          <Link href="/admin/settings/catalog" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--bp-accent)] hover:underline">
            <Gauge size={13} />ویرایش در تنظیمات
          </Link>
        </section>
      </div>

      <section className="bp-frame relative p-[18px]">
        <BpKicker>تاریخچه نرخ</BpKicker>
        <div className="bp-card-title mt-0.5">روند نرخ هر گرم طلای ۱۸ عیار</div>
        <div className="mt-4">
          {chartData.length > 1 ? (
            <BpLineChart ariaLabel="نمودار تاریخچه نرخ طلا" data={chartData} money />
          ) : (
            <div className="grid place-items-center px-5 py-12 text-center">
              <strong className="text-sm">داده کافی برای رسم نمودار نیست</strong>
              <span className="bp-muted mt-1 text-xs">با دریافت نرخ‌های بیشتر، روند این‌جا نمایش داده می‌شود.</span>
            </div>
          )}
        </div>
      </section>

      <section className="bp-frame relative overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-[18px] py-4">
          <Clock3 size={16} className="text-[var(--bp-accent)]" />
          <div role="heading" aria-level={2} className="text-[13px] font-bold">۴۸ رکورد اخیر</div>
          <span className="bp-muted text-[11px]">{history.length.toLocaleString("fa-IR")} رکورد</span>
        </div>
        {history.length ? (
          <AdminColumnVisibility tableId={GOLD_PRICES_TABLE_ID} columns={goldPriceColumns} initialHidden={initialHiddenColumns}>
          <AdminReadOnlyTableToolbar label="تاریخچهٔ فقط‌خواندنی نرخ" description="نرخ‌های دریافت‌شده برای حفظ سابقه قابل ویرایش نیستند." leading={<AdminColumnSettingsButton />} />
          <BpTable ariaLabel="تاریخچه نرخ طلا" minWidth={520}>
            <thead>
              <tr>
                <BpTh className="w-12">ردیف</BpTh>
                <AdminColumn id="price"><BpTh>نرخ</BpTh></AdminColumn>
                <AdminColumn id="source"><BpTh><span className="inline-flex items-center">منبع<AdminColumnFilter path="/admin/gold" ariaLabel="فیلتر منبع نرخ" groups={[{ name: "source", label: "منبع", value: source, options: [{ value: "", label: "همه منابع" }, ...sources.map((item) => ({ value: item, label: item }))] }]} /></span></BpTh></AdminColumn>
                <AdminColumn id="fetchedAt"><BpTh>زمان دریافت</BpTh></AdminColumn>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <BpTd className="bp-muted font-bold">{(index + 1).toLocaleString("fa-IR")}</BpTd>
                  <AdminColumn id="price"><BpTd className="whitespace-nowrap text-[13px] font-bold">{formatMoney(row.pricePerGram18.toString())}</BpTd></AdminColumn>
                  <AdminColumn id="source"><BpTd><BpTag tone="neutral"><span dir="ltr">{row.source}</span></BpTag></BpTd></AdminColumn>
                  <AdminColumn id="fetchedAt"><BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatDateTime(row.fetchedAt)}</BpTd></AdminColumn>
                </tr>
              ))}
            </tbody>
          </BpTable>
          </AdminColumnVisibility>
        ) : (
          <AdminEmptyState title="رکوردی ثبت نشده است" description="هنوز هیچ نرخ طلایی در فروشگاه ذخیره نشده است." />
        )}
      </section>
    </div>
  );
}
