import { bodyStyle, buildXlsx, columnName, type StyleName, type XlsxCell, type XlsxRow, type XlsxSheet } from "@/lib/xlsx/workbook";
import type { SalesReport } from "./sales-report";

const COLUMNS = 5;
// Jalali dates with Latin digits, matching the numeric cells (which Excel shows in Latin digits and
// which must stay real numbers so the totals can add them up) — one digit system across the file.
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" });
const weekdayFormat = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });
const count = (value: number) => Math.round(value).toLocaleString("en-US");

const cell = (value: XlsxCell["value"], style: StyleName, extra: Partial<XlsxCell> = {}): XlsxCell => ({ value, style, ...extra });
const blanks = (count: number, style: StyleName): XlsxCell[] => Array.from({ length: count }, () => ({ style }));
const spacer = (height = 12): XlsxRow => ({ cells: blanks(COLUMNS, "blank"), height });

/** A cell that spans `span` columns: its content, then styled blanks the merge covers. */
function spanning(value: XlsxCell["value"], style: StyleName, span: number): XlsxCell[] {
  return [cell(value, style), ...blanks(span - 1, style)];
}

/** Records a merge of columns `from`–`to` (0-based) on the 1-based row number `row`. */
function merge(merges: string[], row: number, from: number, to: number) {
  merges.push(`${columnName(from)}${row}:${columnName(to)}${row}`);
}

type Layout = { rows: XlsxRow[]; merges: string[] };

/** Appends a full-width row (title, subtitle, section heading, note) and returns its 1-based number. */
function fullWidth(layout: Layout, value: string, style: StyleName, height: number): number {
  layout.rows.push({ cells: spanning(value, style, COLUMNS), height });
  const row = layout.rows.length;
  merge(layout.merges, row, 0, COLUMNS - 1);
  return row;
}

function header(layout: Layout, labels: Array<{ text: string; center?: boolean }>) {
  layout.rows.push({
    cells: Array.from({ length: COLUMNS }, (_, index) => {
      const label = labels[index];
      return label ? cell(label.text, label.center ? "thCenter" : "thText") : cell(null, "thText");
    }),
    height: 26,
  });
}

function emptyState(layout: Layout, text: string) {
  fullWidth(layout, text, "empty", 34);
}

function periodText(report: SalesReport) {
  const start = new Date(report.period.start);
  const end = new Date(report.period.end);
  const days = Math.max(1, Math.round((new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0)) / 86_400_000) + 1);
  return `بازهٔ گزارش: از ${dateFormat.format(start)} تا ${dateFormat.format(end)}  (${count(days)} روز)`;
}

/** Sheet 1: the summary — key figures, best-selling products and top categories. */
function summarySheet(report: SalesReport, generatedAt: Date): XlsxSheet {
  const layout: Layout = { rows: [], merges: [] };
  const { kpis, topProducts, topCategories } = report;

  fullWidth(layout, "گزارش مالی و فروش", "title", 40);
  fullWidth(layout, periodText(report), "subtitle", 22);
  fullWidth(layout, `تاریخ تهیه: ${dateFormat.format(generatedAt)}`, "subtitle", 22);
  layout.rows.push(spacer(14));

  fullWidth(layout, "شاخص‌های کلیدی", "section", 28);
  layout.rows.push({ cells: [cell("شاخص", "thText"), cell(null, "thText"), cell("مقدار", "thCenter"), cell("توضیح", "thText"), cell(null, "thText")], height: 26 });
  merge(layout.merges, layout.rows.length, 0, 1);
  merge(layout.merges, layout.rows.length, 3, 4);
  const indicators: Array<{ label: string; value: number; note: string }> = [
    { label: "مجموع فروش (ریال)", value: Math.round(kpis.totalRevenue), note: "سفارش‌های پرداخت‌شده و تکمیل‌شده" },
    { label: "تعداد سفارش", value: kpis.orderCount, note: "سفارش‌های فروش‌رفته در بازه" },
    { label: "میانگین ارزش سفارش (ریال)", value: Math.round(kpis.averageOrderValue), note: "مجموع فروش تقسیم بر تعداد سفارش" },
    { label: "مشتری جدید", value: kpis.newCustomers, note: "حساب‌های مشتری ساخته‌شده در بازه" },
  ];
  for (const indicator of indicators) {
    layout.rows.push({ cells: [cell(indicator.label, "kpiLabel"), cell(null, "kpiLabel"), cell(indicator.value, "kpiInt"), cell(indicator.note, "kpiNote"), cell(null, "kpiNote")], height: 26 });
    merge(layout.merges, layout.rows.length, 0, 1);
    merge(layout.merges, layout.rows.length, 3, 4);
  }
  layout.rows.push(spacer(18));

  fullWidth(layout, "پرفروش‌ترین محصولات", "section", 28);
  header(layout, [{ text: "ردیف", center: true }, { text: "نام محصول" }, { text: "SKU", center: true }, { text: "تعداد فروخته‌شده", center: true }, { text: "درآمد (ریال)" }]);
  if (!topProducts.length) {
    emptyState(layout, "فروش محصولی در این بازه ثبت نشده است.");
  } else {
    const first = layout.rows.length + 1;
    topProducts.forEach((product, index) => {
      layout.rows.push({
        cells: [
          cell(index + 1, bodyStyle("rank", index)),
          cell(product.name, bodyStyle("text", index)),
          cell(product.sku, bodyStyle("code", index)),
          cell(product.quantity, bodyStyle("int", index)),
          cell(Math.round(product.revenue), bodyStyle("money", index)),
        ],
        height: 22,
      });
    });
    const last = layout.rows.length;
    layout.rows.push({
      cells: [
        cell("جمع", "totalLabel"), cell(null, "totalLabel"), cell(null, "totalLabel"),
        cell(topProducts.reduce((sum, product) => sum + product.quantity, 0), "totalInt", { formula: `SUM(D${first}:D${last})` }),
        cell(topProducts.reduce((sum, product) => sum + Math.round(product.revenue), 0), "totalMoney", { formula: `SUM(E${first}:E${last})` }),
      ],
      height: 24,
    });
    merge(layout.merges, layout.rows.length, 0, 2);
  }
  layout.rows.push(spacer(18));

  fullWidth(layout, "پردرآمدترین دسته‌بندی‌ها", "section", 28);
  header(layout, [{ text: "ردیف", center: true }, { text: "نام دسته" }, { text: "درآمد (ریال)" }, { text: "سهم از کل فروش", center: true }]);
  if (!topCategories.length) {
    emptyState(layout, "درآمدی برای دسته‌بندی‌ها در این بازه ثبت نشده است.");
  } else {
    const first = layout.rows.length + 1;
    topCategories.forEach((category, index) => {
      layout.rows.push({
        cells: [
          cell(index + 1, bodyStyle("rank", index)),
          cell(category.name, bodyStyle("text", index)),
          cell(Math.round(category.revenue), bodyStyle("money", index)),
          cell(category.share / 100, bodyStyle("percent", index)),
          cell(null, bodyStyle("text", index)),
        ],
        height: 22,
      });
    });
    const last = layout.rows.length;
    layout.rows.push({
      cells: [
        cell(`جمع ${count(topCategories.length)} دستهٔ برتر`, "totalLabel"), cell(null, "totalLabel"),
        cell(topCategories.reduce((sum, category) => sum + Math.round(category.revenue), 0), "totalMoney", { formula: `SUM(C${first}:C${last})` }),
        cell(topCategories.reduce((sum, category) => sum + category.share, 0) / 100, "totalPercent", { formula: `SUM(D${first}:D${last})` }),
        cell(null, "totalLabel"),
      ],
      height: 24,
    });
    merge(layout.merges, layout.rows.length, 0, 1);
  }
  layout.rows.push(spacer(14));
  fullWidth(layout, "مبالغ بر حسب ریال و بر پایهٔ سفارش‌های پرداخت‌شده، در حال آماده‌سازی، ارسال‌شده و تحویل‌شده است؛ سفارش‌های پرداخت‌نشده، لغوشده و منقضی‌شده در گزارش نیامده‌اند.", "note", 34);

  return { name: "خلاصه گزارش", tabColor: "FF5980A6", columns: [8, 38, 22, 22, 26], rows: layout.rows, merges: layout.merges, landscape: false };
}

/** Sheet 2: one row per day of the period, with formula totals. */
function dailySheet(report: SalesReport, generatedAt: Date): XlsxSheet {
  const layout: Layout = { rows: [], merges: [] };
  fullWidth(layout, "فروش روزانه", "title", 40);
  fullWidth(layout, `${periodText(report)}    |    تاریخ تهیه: ${dateFormat.format(generatedAt)}`, "subtitle", 22);
  header(layout, [{ text: "ردیف", center: true }, { text: "تاریخ", center: true }, { text: "روز هفته", center: true }, { text: "تعداد سفارش", center: true }, { text: "مبلغ فروش (ریال)" }]);
  const freezeRows = layout.rows.length;

  const first = layout.rows.length + 1;
  report.dailySales.forEach((point, index) => {
    const day = new Date(point.date);
    layout.rows.push({
      cells: [
        cell(index + 1, bodyStyle("rank", index)),
        cell(dateFormat.format(day), bodyStyle("code", index)),
        cell(weekdayFormat.format(day), bodyStyle("code", index)),
        cell(point.orderCount, bodyStyle("int", index)),
        cell(Math.round(point.revenue), bodyStyle("money", index)),
      ],
      height: 21,
    });
  });
  const last = layout.rows.length;
  if (report.dailySales.length) {
    layout.rows.push({
      cells: [
        cell("جمع کل", "totalLabel"), cell(null, "totalLabel"), cell(null, "totalLabel"),
        cell(report.dailySales.reduce((sum, point) => sum + point.orderCount, 0), "totalInt", { formula: `SUM(D${first}:D${last})` }),
        cell(report.dailySales.reduce((sum, point) => sum + Math.round(point.revenue), 0), "totalMoney", { formula: `SUM(E${first}:E${last})` }),
      ],
      height: 26,
    });
    merge(layout.merges, layout.rows.length, 0, 2);
  } else {
    emptyState(layout, "روزی در این بازه وجود ندارد.");
  }

  return { name: "فروش روزانه", tabColor: "FF2C455D", columns: [8, 18, 18, 18, 26], rows: layout.rows, merges: layout.merges, freezeRows, landscape: false };
}

/** The finance report as an Excel workbook: a summary sheet and a daily-sales sheet, right-to-left. */
export function buildSalesReportWorkbook(report: SalesReport, generatedAt = new Date()): Buffer {
  return buildXlsx([summarySheet(report, generatedAt), dailySheet(report, generatedAt)], { title: "گزارش مالی و فروش", creator: "پنل مدیریت فروشگاه", created: generatedAt });
}
