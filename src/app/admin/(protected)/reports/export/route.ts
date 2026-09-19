import { getPermittedActor } from "@/modules/auth/session";
import { resolveReportPeriod } from "@/modules/reports/report-range";
import { getSalesReport } from "@/modules/reports/sales-report";
import { buildSalesReportWorkbook } from "@/modules/reports/sales-report-xlsx";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * The report's Excel export. A GET route rather than a Server Action so the response can carry
 * `Content-Disposition: attachment` and the browser saves it as a file; the client button drives
 * it through `fetch` so it can show an in-flight spinner. ADMIN-only, same as the page.
 */
export async function GET(request: Request) {
  const actor = await getPermittedActor("reports:view");
  if (!actor) return new Response("دسترسی مجاز نیست.", { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = resolveReportPeriod({
    range: searchParams.get("range") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  const report = await getSalesReport(period);
  const generatedAt = new Date();
  const workbook = buildSalesReportWorkbook(report, generatedAt);
  const stamp = generatedAt.toISOString().slice(0, 10);

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="sales-report-${stamp}.xlsx"`,
      "Content-Length": String(workbook.length),
      "Cache-Control": "no-store",
    },
  });
}
