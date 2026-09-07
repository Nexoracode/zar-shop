import Link from "next/link";
import { Box, ChevronLeft, PackageCheck, ShoppingBag, Undo2 } from "lucide-react";
import { AlertDescription, AlertRoot, Card } from "@/components/hero";
import { AccountEmptyState, AccountProductCard } from "@/components/account-page-ui";
import { formatDate } from "@/lib/format";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { expirePendingOrders } from "@/modules/orders/expiration";

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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ href, value, label, icon: Icon }) => (
            <Link key={label} href={href} className="group">
              <Card
                variant="secondary"
                className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition group-hover:border-[var(--brand-primary)]"
              >
                <span className="grid size-9 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                  <Icon size={18} />
                </span>
                <strong className="mt-3 block text-xl font-bold">{value.toLocaleString("fa-IR")}</strong>
                <span className="mt-1 block text-xs text-[var(--muted)]">{label}</span>
              </Card>
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
    </>
  );
}
