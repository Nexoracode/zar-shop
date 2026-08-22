import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { Prisma } from "@generated/prisma/client";
import { InvoiceActions } from "@/components/invoice-actions";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { hasPermission } from "@/modules/auth/permissions";
import { requireUser } from "@/modules/auth/session";
import { optionEntries } from "@/modules/products/options";

type InvoiceOrder = Prisma.OrderGetPayload<{ include: { invoice: true; items: true; payments: true; user: true } }>;
type JsonRecord = Record<string, Prisma.JsonValue>;

export const dynamic = "force-dynamic";

function asRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(record: JsonRecord, key: string, fallback = "—") {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function InvoiceInfo({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div><dt className="text-[10px] text-slate-500">{label}</dt><dd className="m-0 mt-0.5 break-words text-xs font-bold text-slate-800" dir={ltr ? "ltr" : undefined}>{value}</dd></div>;
}

function InvoiceSectionTitle({ children, gold }: { children: ReactNode; gold: boolean }) {
  return <h2 className={`m-0 border-b px-3 py-2 text-xs font-bold ${gold ? "border-amber-200 bg-amber-50 text-[#6f5220]" : "border-sky-200 bg-sky-50 text-[#173b68]"}`}>{children}</h2>;
}

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ source?: string | string[] }> }) {
  const user = await requireUser();
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { invoice: true, items: true, payments: { orderBy: { createdAt: "desc" } }, user: true },
  }) as InvoiceOrder | null;

  if (!order?.invoice) notFound();
  const canManageOrders = hasPermission(user.role, "orders:manage");
  if (order.userId !== user.id && !canManageOrders) redirect("/account");
  const openedFromAdmin = query.source === "admin" && canManageOrders;
  const backHref = openedFromAdmin || order.userId !== user.id ? `/admin/orders/${order.id}` : `/account/orders/${order.id}`;

  const seller = asRecord(order.invoice.sellerData);
  const buyer = asRecord(order.invoice.buyerData);
  const address = asRecord(buyer.address ?? order.shippingAddress);
  const snapshotIndustry = text(seller, "industry", "");
  const industry = snapshotIndustry === "GOLD" || snapshotIndustry === "GENERAL" ? snapshotIndustry : order.items.some((item) => item.storeIndustry === "GOLD") ? "GOLD" : "GENERAL";
  const isGold = industry === "GOLD";
  const invoiceCurrency = text(seller, "currency", "IRR") === "IRT" ? "IRT" : "IRR";
  const money = (value: number | string) => formatMoney(value, invoiceCurrency);
  const amount = (value: number | string) => (invoiceCurrency === "IRT" ? Number(value) / 10 : Number(value)).toLocaleString("fa-IR", { maximumFractionDigits: 0 });
  const successfulPayment = order.payments.find((payment) => payment.status === "SUCCESS");
  const buyerName = text(buyer, "name", [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "—");
  const buyerPhone = text(buyer, "phone", text(address, "phone", order.user.phone ?? "—"));
  const fullAddress = [text(address, "province", ""), text(address, "city", ""), text(address, "addressLine", "")].filter(Boolean).join("، ") || "—";
  const cell = "border border-slate-300 px-2 py-2 text-center text-[10px] leading-5 text-slate-700";

  return (
    <main className="invoice-page-shell min-h-screen bg-slate-100 px-3 py-6 sm:px-6" dir="rtl">
      <InvoiceActions backHref={backHref} />

      <article className={`invoice-print-area mx-auto w-full max-w-[210mm] overflow-hidden border-t-4 bg-white p-5 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.12)] sm:p-8 ${isGold ? "border-t-[#b5904c]" : "border-t-[#2563eb]"}`}>
        <header className={`grid gap-4 border-2 px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center ${isGold ? "border-amber-700/70 bg-[#fffdf8]" : "border-slate-700 bg-[#f8fbff]"}`}>
          <div className="text-right"><span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${isGold ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>{isGold ? "فاکتور تخصصی طلا و جواهر" : "فاکتور فروش کالا"}</span><strong className={`block text-lg font-bold ${isGold ? "text-[#6f5220]" : "text-[#173b68]"}`}>{text(seller, "name", isGold ? "زر گالری" : "فروشگاه اینترنتی")}</strong><span className="text-[10px] text-slate-500">{isGold ? "فروشگاه طلا و زیورآلات" : "فروشگاه کالا و خدمات"}</span></div>
          <div className="text-center"><h1 className="m-0 text-xl font-bold">{isGold ? "فاکتور رسمی فروش طلا" : "فاکتور رسمی فروش"}</h1><span className="text-[10px] text-slate-500">صورتحساب کالا و خدمات</span></div>
          <dl className="m-0 space-y-1 text-right text-[10px] sm:text-left"><div><dt className="inline text-slate-500">شماره فاکتور: </dt><dd className="inline font-bold" dir="ltr">{order.invoice.invoiceNumber}</dd></div><div><dt className="inline text-slate-500">تاریخ صدور: </dt><dd className="inline font-bold">{formatDate(order.invoice.issuedAt)}</dd></div><div><dt className="inline text-slate-500">شماره سفارش: </dt><dd className="inline font-bold" dir="ltr">{order.orderNumber}</dd></div></dl>
        </header>

        <section className={`mt-3 border ${isGold ? "border-amber-200" : "border-sky-200"}`}>
          <InvoiceSectionTitle gold={isGold}>مشخصات فروشنده</InvoiceSectionTitle>
          <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 p-3 sm:grid-cols-4">
            <InvoiceInfo label="نام فروشنده" value={text(seller, "name", "زر گالری")} />
            <InvoiceInfo label="شناسه ملی" value={text(seller, "nationalId")} ltr />
            <InvoiceInfo label="کد اقتصادی" value={text(seller, "economicCode")} ltr />
            <InvoiceInfo label="شماره تماس" value={text(seller, "phone")} ltr />
            <InvoiceInfo label="ایمیل" value={text(seller, "email")} ltr />
            <div className="col-span-2 sm:col-span-2"><InvoiceInfo label="نشانی فروشنده" value={text(seller, "address")} /></div>
          </dl>
        </section>

        <section className={`mt-3 border ${isGold ? "border-amber-200" : "border-sky-200"}`}>
          <InvoiceSectionTitle gold={isGold}>مشخصات خریدار</InvoiceSectionTitle>
          <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 p-3 sm:grid-cols-4">
            <InvoiceInfo label="نام خریدار" value={buyerName} />
            <InvoiceInfo label="کد ملی" value={text(buyer, "nationalId", order.user.nationalId ?? "—")} ltr />
            <InvoiceInfo label="شماره تماس" value={buyerPhone} ltr />
            <InvoiceInfo label="ایمیل" value={text(buyer, "email", order.user.isGuest ? "—" : (order.user.email ?? "—"))} ltr />
            <InvoiceInfo label="کد پستی" value={text(address, "postalCode")} ltr />
            <div className="col-span-2 sm:col-span-3"><InvoiceInfo label="نشانی خریدار" value={fullAddress} /></div>
          </dl>
        </section>

        <section className="mt-3 overflow-x-auto print:overflow-visible">
          {isGold ? <table className="w-full min-w-[720px] table-fixed border-collapse print:min-w-0" aria-label="اقلام فاکتور تخصصی طلا">
            <caption className="caption-top pb-1 text-left text-[9px] text-slate-500">تمام مبالغ به {invoiceCurrency === "IRT" ? "تومان" : "ریال"} است.</caption>
            <colgroup><col className="w-[4%]" /><col className="w-[22%]" /><col className="w-[6%]" /><col className="w-[8%]" /><col className="w-[6%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[7%]" /><col className="w-[10%]" /></colgroup>
            <thead className="bg-amber-50"><tr>{["ردیف", "شرح و کد کالا", "تعداد", "وزن واحد", "عیار", "ارزش طلا", "اجرت", "سود", "مالیات", "تخفیف", "مبلغ کل"].map((head) => <th key={head} className={`${cell} font-bold text-[#6f5220]`}>{head}</th>)}</tr></thead>
            <tbody>{order.items.map((item, index) => {
              const quantity = item.quantity;
              return <tr key={item.id}>
                <td className={cell}>{(index + 1).toLocaleString("fa-IR")}</td>
                <td className={`${cell} text-right font-bold`}>{item.name}<small className="mt-1 block font-normal text-slate-500" dir="ltr">{item.sku}</small>{optionEntries(item.selectedOptions).map(([name, value]) => <small key={name} className="mt-1 block font-normal text-slate-500">{name}: {value}</small>)}</td>
                <td className={cell}>{quantity.toLocaleString("fa-IR")}</td>
                <td className={cell}>{Number(item.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم</td>
                <td className={cell}>{item.purity.toLocaleString("fa-IR")}</td>
                <td className={cell}>{amount(Number(item.rawGold) * quantity)}</td>
                <td className={cell}>{amount(Number(item.makingFee) * quantity)}</td>
                <td className={cell}>{amount(Number(item.profit) * quantity)}</td>
                <td className={cell}>{amount(Number(item.tax) * quantity)}</td>
                <td className={cell}>{amount(Number(item.discountAmount) * quantity)}</td>
                <td className={`${cell} font-bold`}>{amount(item.total.toString())}</td>
              </tr>;
            })}</tbody>
          </table> : <table className="w-full min-w-[620px] table-fixed border-collapse print:min-w-0" aria-label="اقلام فاکتور فروش کالا">
            <caption className="caption-top pb-1 text-left text-[9px] text-slate-500">تمام مبالغ به {invoiceCurrency === "IRT" ? "تومان" : "ریال"} است.</caption>
            <colgroup><col className="w-[5%]" /><col className="w-[35%]" /><col className="w-[8%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[12%]" /></colgroup>
            <thead className="bg-sky-50"><tr>{["ردیف", "شرح و کد کالا", "تعداد", "قیمت اصلی واحد", "تخفیف واحد", "قیمت فروش واحد", "مبلغ کل"].map((head) => <th key={head} className={`${cell} font-bold text-[#173b68]`}>{head}</th>)}</tr></thead>
            <tbody>{order.items.map((item, index) => <tr key={item.id}>
              <td className={cell}>{(index + 1).toLocaleString("fa-IR")}</td>
              <td className={`${cell} text-right font-bold`}>{item.name}<small className="mt-1 block font-normal text-slate-500" dir="ltr">{item.sku}</small>{optionEntries(item.selectedOptions).map(([name, value]) => <small key={name} className="mt-1 block font-normal text-slate-500">{name}: {value}</small>)}</td>
              <td className={cell}>{item.quantity.toLocaleString("fa-IR")}</td>
              <td className={cell}>{amount(item.originalUnitPrice.toString())}</td>
              <td className={cell}>{amount(item.discountAmount.toString())}</td>
              <td className={cell}>{amount(item.unitPrice.toString())}</td>
              <td className={`${cell} font-bold`}>{amount(item.total.toString())}</td>
            </tr>)}</tbody>
          </table>}
        </section>

        <section className="mt-3 grid gap-3 sm:grid-cols-[1fr_290px]">
          <div className={`border p-3 text-[10px] leading-6 text-slate-600 ${isGold ? "border-amber-200 bg-amber-50/30" : "border-sky-200 bg-sky-50/30"}`}>
            <strong className={`block text-xs ${isGold ? "text-[#6f5220]" : "text-[#173b68]"}`}>اطلاعات پرداخت</strong>
            <span>وضعیت: {successfulPayment ? "پرداخت موفق" : "در انتظار پرداخت"}</span><br />
            <span>تاریخ پرداخت: {successfulPayment?.paidAt ? formatDateTime(successfulPayment.paidAt) : "—"}</span><br />
            <span>شناسه مرجع: <b dir="ltr">{successfulPayment?.referenceId ?? "—"}</b></span><br />
            {isGold && <span>نرخ هر گرم طلای ۱۸ عیار هنگام ثبت سفارش: {money(order.goldPriceSnapshot.toString())}</span>}
            <p className="mb-0 mt-2 border-t border-current/10 pt-2 leading-5">{isGold ? "وزن، عیار، نرخ طلا، اجرت، سود و مالیات از اطلاعات ثبت‌شده هنگام سفارش محاسبه شده‌اند." : "قیمت‌ها و تخفیف‌ها مطابق اطلاعات قطعی ثبت‌شده هنگام سفارش هستند."}</p>
          </div>
          <dl className={`m-0 border text-xs ${isGold ? "border-amber-200" : "border-sky-200"}`}>
            <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>{isGold ? "جمع اقلام طلا" : "جمع قیمت کالاها"}</dt><dd>{money(order.subtotal.toString())}</dd></div>
            {Number(order.productDiscount) > 0 && <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>تخفیف محصولات</dt><dd>{money(order.productDiscount.toString())}</dd></div>}
            {Number(order.promotionDiscount) > 0 && <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>تخفیف پروموشن</dt><dd>{money(order.promotionDiscount.toString())}</dd></div>}
            {Number(order.shippingDiscount) > 0 && <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>تخفیف ارسال</dt><dd>{money(order.shippingDiscount.toString())}</dd></div>}
            <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>ارسال</dt><dd>{money(order.shipping.toString())}</dd></div>
            {isGold && Number(order.tax) > 0 && <div className="flex justify-between border-b border-slate-200 px-3 py-2 text-slate-500"><dt>مالیات لحاظ‌شده در قیمت</dt><dd>{money(order.tax.toString())}</dd></div>}
            <div className={`flex justify-between px-3 py-2.5 font-bold ${isGold ? "bg-amber-50 text-[#6f5220]" : "bg-sky-50 text-[#173b68]"}`}><dt>مبلغ نهایی</dt><dd>{money(order.total.toString())}</dd></div>
          </dl>
        </section>

        {order.notes && <section className="mt-3 border border-slate-300 px-3 py-2 text-[10px]"><strong>توضیحات:</strong> {order.notes}</section>}

        <footer className="mt-5 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="min-h-20 border-t border-dashed border-slate-400 pt-2">{isGold ? "مهر و امضای طلافروش" : "مهر و امضای فروشنده"}</div>
          <div className="min-h-20 border-t border-dashed border-slate-400 pt-2">امضای خریدار</div>
        </footer>
      </article>
    </main>
  );
}
