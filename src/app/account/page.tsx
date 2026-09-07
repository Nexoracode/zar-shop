import Link from "next/link";
import { Box, ChevronLeft, Gift, PackageCheck, ShoppingBag, Undo2, Wallet } from "lucide-react";
import { AlertDescription, AlertRoot } from "@/components/hero";
import { AccountEmptyState, AccountProductCard } from "@/components/account-page-ui";
import { ReferralShare } from "@/components/referral-share";
import { env } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/format";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { ensureReferralCode } from "@/modules/wallet/referral-code";
import { ensureWallet } from "@/modules/wallet/wallet";

const paymentMessages = {
  cancelled: { status: "warning" as const, text: "پرداخت لغو شد؛ سفارش تا پایان مهلت پرداخت برای شما نگه داشته می‌شود." },
  failed: { status: "danger" as const, text: "تأیید پرداخت ناموفق بود. اگر مبلغی کسر شده است، نتیجه را از پشتیبانی پیگیری کنید." },
  missing: { status: "danger" as const, text: "اطلاعات پرداخت پیدا نشد." },
  review: { status: "warning" as const, text: "پرداخت در درگاه تأیید شده و ثبت نهایی آن در حال بررسی خودکار است؛ دوباره پرداخت نکنید." },
};

// The summary page shows a preview of recent visits; the full history lives at /account/recent-visits.
const RECENT_VISITS_SHOWN = 8;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireUser();
  await expirePendingOrders();
  const paymentMessage = paymentMessages[(await searchParams).payment as keyof typeof paymentMessages];

  const [totalOrders, activeOrders, deliveredOrders, returnCount, visits] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.order.count({ where: { userId: user.id, status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] } } }),
    db.order.count({ where: { userId: user.id, status: "DELIVERED" } }),
    db.return.count({ where: { userId: user.id } }),
    db.productVisit.findMany({
      where: { userId: user.id, product: { status: "ACTIVE" } },
      orderBy: { visitedAt: "desc" },
      take: RECENT_VISITS_SHOWN,
      include: { product: { include: { category: true, media: { take: 1, orderBy: { position: "asc" }, include: { media: true } } } } },
    }),
  ]);

  const stats = [
    { href: "/account/orders", value: totalOrders, label: "کل سفارش‌ها", icon: ShoppingBag },
    { href: "/account/orders", value: activeOrders, label: "در حال پیگیری", icon: Box },
    { href: "/account/orders", value: deliveredOrders, label: "تحویل‌شده", icon: PackageCheck },
    { href: "/account/returns", value: returnCount, label: "مرجوعی‌ها", icon: Undo2 },
  ];

  const walletSettings = await getWalletSettings();
  const showWallet = !user.isGuest && walletSettings.walletEnabled;
  const showReferral = !user.isGuest && walletSettings.referralEnabled;
  const [walletBalance, referralCode, currency] = showWallet || showReferral
    ? await Promise.all([
      showWallet ? ensureWallet(db, user.id).then((wallet) => wallet.balance.toString()) : Promise.resolve("0"),
      showReferral ? ensureReferralCode(db, user.id) : Promise.resolve(""),
      getGeneralStoreSettings().then((settings) => settings.currency),
    ])
    : ["0", "", "IRR" as const];

  return (
    <>
      {paymentMessage && <AlertRoot status={paymentMessage.status}><AlertDescription>{paymentMessage.text}</AlertDescription></AlertRoot>}
      {user.isGuest && <AlertRoot status="warning"><AlertDescription>برای نگهداری دائمی فعالیت‌ها، ثبت‌نام خود را تکمیل کنید.</AlertDescription></AlertRoot>}

      <section aria-labelledby="account-order-stats">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="account-order-stats" className="m-0 text-base font-bold">آمار سفارش‌ها</h2>
          <Link href="/account/orders" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">
            مشاهده سفارش‌ها<ChevronLeft size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(({ href, value, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[var(--brand-primary)]"
            >
              <Icon size={16} className="shrink-0 text-[var(--brand-primary)]" />
              <span className="min-w-0">
                <strong className="block text-sm font-bold leading-5">{value.toLocaleString("fa-IR")}</strong>
                <span className="block truncate text-[11px] text-[var(--muted)]">{label}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="account-recent-visits">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="account-recent-visits" className="m-0 text-base font-bold">بازدیدهای اخیر</h2>
          {visits.length > 0 && (
            <Link href="/account/recent-visits" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">
              مشاهده همه<ChevronLeft size={15} />
            </Link>
          )}
        </div>
        {visits.length === 0 ? (
          <AccountEmptyState
            title="هنوز بازدیدی ثبت نشده است"
            description="محصولاتی که مشاهده می‌کنید به‌ترتیب آخرین بازدید در این بخش نمایش داده می‌شوند."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {visits.map(({ product, visitedAt, visitCount }) => (
              <AccountProductCard
                key={product.id}
                item={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  category: product.category?.name ?? null,
                  image: product.media[0] ? { url: product.media[0].media.url, alt: product.media[0].media.alt } : null,
                }}
                meta={<span>{formatDate(visitedAt)} · {visitCount.toLocaleString("fa-IR")} بازدید</span>}
              />
            ))}
          </div>
        )}
      </section>

      {(showWallet || showReferral) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {showWallet && (
            <Link href="/account/wallet" className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-[var(--brand-primary)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Wallet size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-[var(--muted)]">موجودی کیف پول</span>
                <strong className="block text-base font-bold">{formatMoney(walletBalance, currency)}</strong>
              </span>
              <ChevronLeft size={16} className="shrink-0 text-[var(--muted)]" />
            </Link>
          )}
          {showReferral && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold"><Gift size={17} className="text-[var(--brand-primary)]" />دعوت دوستان</span>
                <Link href="/account/referral" className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)]">جزئیات<ChevronLeft size={13} /></Link>
              </div>
              <ReferralShare code={referralCode} inviteUrl={`${env.APP_URL}/register?ref=${referralCode}`} />
            </div>
          )}
        </section>
      )}
    </>
  );
}
