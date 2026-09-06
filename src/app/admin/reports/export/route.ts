import { getPermittedActor } from "@/modules/auth/session";
import { resolveReportPeriod } from "@/modules/reports/report-range";
import { buildSalesReportCsv, getSalesReport } from "@/modules/reports/sales-report";

/**
 * The report's CSV export. A GET route rather than a Server Action so the response can carry
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
  // Leading BOM (U+FEFF) so Excel opens the Persian text as UTF-8.
  const body = "\uFEFF" + buildSalesReportCsv(report);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-report-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
