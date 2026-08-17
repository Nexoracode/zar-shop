"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Input } from "@heroui/react";
import { Check, ChevronLeft, FileText, PackageCheck, RotateCcw, Search, ShoppingBag, X } from "lucide-react";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";

type OrderStatus = "PENDING_PAYMENT" | "EXPIRED" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
type OrderTab = "current" | "delivered" | "refunded" | "cancelled";

export type AccountOrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  date: string;
  total: string;
  itemCount: number;
  expiresAt: string | null;
  hasInvoice: boolean;
  images: Array<{ id: string; url: string; alt: string }>;
};

const tabs: Array<{ id: OrderTab; label: string; statuses: OrderStatus[] }> = [
  { id: "current", label: "جاری", statuses: ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"] },
  { id: "delivered", label: "تحویل‌شده", statuses: ["DELIVERED"] },
  { id: "refunded", label: "مرجوع‌شده", statuses: ["REFUNDED"] },
  { id: "cancelled", label: "لغوشده", statuses: ["CANCELLED", "EXPIRED"] },
];

const statusStyles: Record<OrderStatus, { icon: typeof Check; className: string }> = {
  PENDING_PAYMENT: { icon: ShoppingBag, className: "bg-amber-500 text-white" },
  PAID: { icon: Check, className: "bg-sky-600 text-white" },
  PROCESSING: { icon: PackageCheck, className: "bg-amber-500 text-white" },
  SHIPPED: { icon: PackageCheck, className: "bg-sky-600 text-white" },
  DELIVERED: { icon: Check, className: "bg-emerald-500 text-white" },
  CANCELLED: { icon: X, className: "bg-slate-400 text-white" },
  EXPIRED: { icon: X, className: "bg-slate-400 text-white" },
  REFUNDED: { icon: RotateCcw, className: "bg-slate-400 text-white" },
};

export function AccountOrdersPanel({ orders, showCountdown, warningMinutes }: { orders: AccountOrderSummary[]; showCountdown: boolean; warningMinutes: number }) {
  const [activeTab, setActiveTab] = useState<OrderTab>("current");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab.id, orders.filter((order) => tab.statuses.includes(order.status)).length])) as Record<OrderTab, number>, [orders]);
  const visibleOrders = useMemo(() => {
    const tab = tabs.find((item) => item.id === activeTab)!;
    const normalized = query.trim().toLocaleLowerCase("fa-IR");
    return orders.filter((order) => tab.statuses.includes(order.status) && (!normalized || order.orderNumber.toLocaleLowerCase("fa-IR").includes(normalized) || order.statusLabel.includes(normalized)));
  }, [activeTab, orders, query]);

  return <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]" dir="rtl">
    <header className="px-4 pt-5 sm:px-6 sm:pt-7">
      <div className="flex min-h-10 items-center justify-between gap-4">
        <h1 className="m-0 text-base font-bold sm:text-lg">تاریخچه سفارشات</h1>
        {searchOpen ? <div className="flex w-full max-w-xs items-center gap-1"><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} variant="secondary" aria-label="جستجو در سفارش‌ها" placeholder="جستجوی کد یا وضعیت سفارش" className="min-h-10 flex-1 rounded-lg text-sm" /><Button type="button" isIconOnly variant="ghost" aria-label="بستن جستجو" onPress={() => { setSearchOpen(false); setQuery(""); }} className="size-9 min-h-9 min-w-9"><X size={18} /></Button></div> : <Button type="button" isIconOnly variant="ghost" aria-label="جستجو در سفارش‌ها" onPress={() => setSearchOpen(true)} className="size-10 min-h-10 min-w-10 text-slate-600"><Search size={21} /></Button>}
      </div>
      <nav className="mt-6 flex gap-5 overflow-x-auto" aria-label="وضعیت سفارش‌ها">{tabs.map((tab) => <Button key={tab.id} type="button" variant="ghost" onPress={() => setActiveTab(tab.id)} className={`relative min-h-12 shrink-0 rounded-none bg-transparent px-1 text-xs hover:bg-transparent data-[hovered=true]:bg-transparent sm:text-sm ${activeTab === tab.id ? "font-bold text-[var(--brand-primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-[var(--brand-primary)]" : "font-medium text-[var(--muted)]"}`}>{tab.label}<span className={`grid min-w-5 place-items-center rounded px-1 py-0.5 text-[10px] ${activeTab === tab.id ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "bg-slate-300 text-white"}`}>{counts[tab.id].toLocaleString("fa-IR")}</span></Button>)}</nav>
    </header>

    <div className="grid gap-4 border-t border-[var(--border)] p-4 sm:p-5">
      {!visibleOrders.length ? <div className="grid min-h-64 place-items-center p-6 text-center"><div><ShoppingBag size={40} className="mx-auto text-slate-300" /><strong className="mt-4 block text-sm">{orders.length ? "سفارشی در این بخش نیست" : "هنوز سفارشی ثبت نکرده‌اید"}</strong><p className="mb-0 mt-2 text-xs leading-6 text-[var(--muted)]">{query ? "نتیجه‌ای مطابق جستجوی شما پیدا نشد." : orders.length ? "سفارشی با این وضعیت ثبت نشده است." : "پس از خرید، سفارش‌های شما در این صفحه قابل پیگیری هستند."}</p></div></div> : visibleOrders.map((order) => {
        const status = statusStyles[order.status];
        const StatusIcon = status.icon;
        return <article key={order.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <Link href={`/account/orders/${order.id}`} className="block px-4 py-4 transition hover:bg-[var(--surface-secondary)]/45 sm:px-5">
            <div className="flex items-center gap-3"><span className={`grid size-5 shrink-0 place-items-center rounded-full ${status.className}`}><StatusIcon size={13} strokeWidth={2.5} /></span><strong className="text-sm">{order.statusLabel}</strong><ChevronLeft size={20} className="mr-auto text-slate-600" /></div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--muted)]"><span>{order.date}</span><span className="text-slate-300">•</span><span>کد سفارش <b className="text-[var(--foreground)]" dir="ltr">{order.orderNumber}</b></span><span className="text-slate-300">•</span><span>مبلغ <b className="text-[var(--foreground)]">{order.total}</b></span>{showCountdown && order.status === "PENDING_PAYMENT" && order.expiresAt ? <OrderExpiryCountdown expiresAt={order.expiresAt} warningMinutes={warningMinutes} /> : null}</div>
          </Link>
          <div className="flex min-h-24 items-center gap-3 border-t border-[var(--border)] px-4 py-3 sm:px-5">{order.images.length ? order.images.map((image) => <span key={image.id} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-white"><Image src={image.url} alt={image.alt} fill sizes="64px" className="object-contain p-1" /></span>) : <span className="grid size-16 place-items-center rounded-lg bg-[var(--surface-secondary)] text-slate-300"><ShoppingBag size={25} /></span>}<span className="mr-auto text-xs text-[var(--muted)]">{order.itemCount.toLocaleString("fa-IR")} کالا</span></div>
          {order.hasInvoice ? <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5"><Link href={`/invoices/${order.id}`} className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[var(--brand-primary)]"><FileText size={17} />مشاهده فاکتور</Link></div> : null}
        </article>;
      })}
    </div>
  </section>;
}
