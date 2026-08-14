import Link from "next/link";
import { Box, ChevronLeft, CircleUserRound, CreditCard, Heart, LogOut, MapPin, PackageCheck, ShoppingBag, UserRound } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { AlertDescription, AlertRoot, Button, Card } from "@/components/hero";
import { AdminStatusBadge } from "@/components/admin-ui";
import { orderStatusLabels, orderStatusTones } from "@/modules/admin/labels";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";
import { SmsConsentPreference } from "@/components/sms-consent-preference";
import { ProfileEditor } from "@/components/profile-editor";
import { AccountAddressBook } from "@/components/account-address-book";
import { serializeAddress } from "@/modules/account/addresses";

const paymentMessages = {
  cancelled: { status: "warning" as const, text: "پرداخت لغو شد؛ سفارش تا پایان مهلت پرداخت برای شما نگه داشته می‌شود." },
  failed: { status: "danger" as const, text: "تأیید پرداخت ناموفق بود. اگر مبلغی کسر شده است، نتیجه را از پشتیبانی پیگیری کنید." },
  missing: { status: "danger" as const, text: "اطلاعات پرداخت پیدا نشد." },
  review: { status: "warning" as const, text: "پرداخت در درگاه تأیید شده و ثبت نهایی آن در حال بررسی خودکار است؛ دوباره پرداخت نکنید." },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireUser();
  const paymentMessage = paymentMessages[(await searchParams).payment as keyof typeof paymentMessages];
  await expirePendingOrders();
  const [orders, addresses, settings, orderSettings] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { items: true } } } }),
    db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }], include: { provinceRef: true, cityRef: true } }),
    getGeneralStoreSettings(),
    getOrderSettings(),
  ]);
  const displayName = user.isGuest ? "خریدار مهمان" : `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const delivered = orders.filter((order) => order.status === "DELIVERED").length;
  const active = orders.filter((order) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status)).length;
  const serializedAddresses = addresses.map(serializeAddress);

  const menu = [
    { href: "#overview", label: "خلاصه فعالیت‌ها", icon: CircleUserRound },
    { href: "#orders", label: "سفارش‌های من", icon: ShoppingBag, count: orders.length },
    { href: "#addresses", label: "نشانی‌ها", icon: MapPin, count: addresses.length },
    { href: "#personal-info", label: "اطلاعات حساب", icon: UserRound },
  ];

  return (
    <main className="bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-10" dir="rtl">
      <div className="mx-auto grid w-full max-w-[1280px] items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><UserRound size={24} /></span>
              <div className="min-w-0"><strong className="block truncate text-sm">{displayName}</strong><span className="mt-1 block text-xs text-[var(--muted)]" dir="ltr">{user.phone ?? user.email}</span></div>
            </div>
            <nav aria-label="منوی حساب کاربری" className="p-2">
              {menu.map(({ href, label, icon: Icon, count }) => <Link key={href} href={href} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--brand-primary)]"><Icon size={19} /><span>{label}</span>{typeof count === "number" && <span className="mr-auto rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--muted)]">{count.toLocaleString("fa-IR")}</span>}</Link>)}
            </nav>
            <form action="/api/auth/logout" method="post" className="border-t border-[var(--border)] p-2">
              <Button type="submit" variant="ghost" fullWidth className="min-h-12 justify-start gap-3 px-3 text-[var(--danger)]"><LogOut size={19} />خروج از حساب کاربری</Button>
            </form>
          </Card>
          <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><CreditCard size={20} /></span><div><strong className="block text-xs">کیف پول</strong><span className="text-[11px] text-[var(--muted)]">به‌زودی در دسترس</span></div><ChevronLeft size={18} className="mr-auto text-[var(--muted)]" /></div>
          </Card>
        </aside>

        <div className="grid min-w-0 gap-5">
          {paymentMessage && <AlertRoot status={paymentMessage.status}><AlertDescription>{paymentMessage.text}</AlertDescription></AlertRoot>}
          {user.isGuest && <AlertRoot status="warning"><AlertDescription>برای نگهداری دائمی اطلاعات حساب و نشانی‌ها، ثبت‌نام خود را تکمیل کنید.</AlertDescription></AlertRoot>}

          <section id="overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { value: active, label: "سفارش جاری", icon: Box },
              { value: delivered, label: "تحویل‌شده", icon: PackageCheck },
              { value: orders.length, label: "همه سفارش‌ها", icon: ShoppingBag },
              { value: 0, label: "فهرست علاقه‌مندی", icon: Heart },
            ].map(({ value, label, icon: Icon }) => <Card key={label} variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Icon size={19} /></span><ChevronLeft size={17} className="text-[var(--muted)]" /></div><strong className="block text-xl font-black">{value.toLocaleString("fa-IR")}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{label}</span></Card>)}
          </section>

          {!user.isGuest && <ProfileEditor initialProfile={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, nationalId: user.nationalId }} />}
          {!user.isGuest && <SmsConsentPreference initialValue={user.smsMarketingConsent} />}
          <AccountAddressBook initialAddresses={serializedAddresses} user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone }} />

          <section id="orders" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <header className="flex items-center justify-between border-b border-[var(--border)] p-5"><div><h2 className="m-0 text-base font-black">سفارش‌های من</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">پیگیری سفارش‌ها و پرداخت‌های اخیر</p></div><span className="text-xs text-[var(--muted)]">{orders.length.toLocaleString("fa-IR")} سفارش</span></header>
            <div className="divide-y divide-[var(--border)]">
              {orders.map((order) => <article key={order.id} className="p-5 transition hover:bg-[var(--surface-secondary)]/40"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex flex-wrap items-center gap-3"><AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge><span className="text-xs text-[var(--muted)]">{formatDate(order.createdAt)}</span><span className="text-xs text-[var(--muted)]">کد سفارش <b dir="ltr">{order.orderNumber}</b></span></div><strong className="text-sm">{formatMoney(order.total.toString(), settings.currency)}</strong></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-4"><span className="text-xs text-[var(--muted)]">{order._count.items.toLocaleString("fa-IR")} کالا</span>{orderSettings.showOrderCountdown && order.status === "PENDING_PAYMENT" && order.expiresAt ? <OrderExpiryCountdown expiresAt={order.expiresAt.toISOString()} warningMinutes={orderSettings.orderWarningMinutes} /> : <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">مشاهده جزئیات <ChevronLeft size={15} /></span>}</div></article>)}
              {!orders.length && <div className="grid min-h-56 place-items-center p-6 text-center"><div><ShoppingBag size={40} className="mx-auto text-[var(--muted)]" /><strong className="mt-4 block text-sm">هنوز سفارشی ثبت نکرده‌اید</strong><Link href="/products" className="mt-3 inline-flex text-xs font-bold text-[var(--brand-primary)]">مشاهده محصولات</Link></div></div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
