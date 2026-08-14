import Link from "next/link";
import { Box, ChevronLeft, Clock3, Heart, MapPin, MessageSquareText, PackageCheck, ShoppingBag, Star, UserRound } from "lucide-react";
import { AlertDescription, AlertRoot, Card } from "@/components/hero";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { expirePendingOrders } from "@/modules/orders/expiration";

const paymentMessages = {
  cancelled: { status: "warning" as const, text: "پرداخت لغو شد؛ سفارش تا پایان مهلت پرداخت برای شما نگه داشته می‌شود." },
  failed: { status: "danger" as const, text: "تأیید پرداخت ناموفق بود. اگر مبلغی کسر شده است، نتیجه را از پشتیبانی پیگیری کنید." },
  missing: { status: "danger" as const, text: "اطلاعات پرداخت پیدا نشد." },
  review: { status: "warning" as const, text: "پرداخت در درگاه تأیید شده و ثبت نهایی آن در حال بررسی خودکار است؛ دوباره پرداخت نکنید." },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireUser(); await expirePendingOrders();
  const paymentMessage = paymentMessages[(await searchParams).payment as keyof typeof paymentMessages];
  const [orders, delivered, active, addresses, favorites, reviews, visits] = await Promise.all([
    db.order.count({ where: { userId: user.id } }), db.order.count({ where: { userId: user.id, status: "DELIVERED" } }),
    db.order.count({ where: { userId: user.id, status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] } } }), db.address.count({ where: { userId: user.id } }),
    db.productFavorite.count({ where: { userId: user.id } }), db.productReview.count({ where: { userId: user.id, parentId: null } }), db.productVisit.count({ where: { userId: user.id } }),
  ]);
  const cards = [
    { href: "/account/orders", value: active, label: "سفارش جاری", icon: Box }, { href: "/account/orders", value: delivered, label: "تحویل‌شده", icon: PackageCheck },
    { href: "/account/favorites", value: favorites, label: "علاقه‌مندی‌ها", icon: Heart }, { href: "/account/reviews", value: reviews, label: "دیدگاه‌های شما", icon: MessageSquareText },
  ];
  const shortcuts = [
    { href: "/account/orders", label: `${orders.toLocaleString("fa-IR")} سفارش`, icon: ShoppingBag }, { href: "/account/addresses", label: `${addresses.toLocaleString("fa-IR")} نشانی`, icon: MapPin },
    { href: "/account/reviews/pending", label: "در انتظار دیدگاه", icon: Star }, { href: "/account/recent-visits", label: `${visits.toLocaleString("fa-IR")} بازدید اخیر`, icon: Clock3 }, { href: "/account/profile", label: "اطلاعات حساب", icon: UserRound },
  ];
  return <>{paymentMessage && <AlertRoot status={paymentMessage.status}><AlertDescription>{paymentMessage.text}</AlertDescription></AlertRoot>}{user.isGuest && <AlertRoot status="warning"><AlertDescription>برای نگهداری دائمی فعالیت‌ها، ثبت‌نام خود را تکمیل کنید.</AlertDescription></AlertRoot>}<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ href, value, label, icon: Icon }) => <Link href={href} key={label}><Card variant="secondary" className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:border-[var(--brand-primary)]"><div className="mb-4 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Icon size={19} /></span><ChevronLeft size={17} className="text-[var(--muted)]" /></div><strong className="block text-xl font-black">{value.toLocaleString("fa-IR")}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{label}</span></Card></Link>)}</section><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="m-0 text-base font-black">دسترسی سریع</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{shortcuts.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--border)] px-4 text-sm font-bold transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"><Icon size={19} />{label}<ChevronLeft size={16} className="mr-auto" /></Link>)}</div></section></>;
}
