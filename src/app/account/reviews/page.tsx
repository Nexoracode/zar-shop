import Link from "next/link";
import { Star } from "lucide-react";
import { AccountEmptyState, AccountPageHeader } from "@/components/account-page-ui";
import { AdminStatusBadge } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";

const tones = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;
const labels = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;

export default async function ReviewsPage() {
  const user = await requireUser();
  const reviews = await db.productReview.findMany({ where: { userId: user.id, parentId: null }, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, slug: true } } } });
  return <><AccountPageHeader title="دیدگاه‌های شما" description="وضعیت امتیازها و دیدگاه‌هایی که ثبت کرده‌اید" />{!reviews.length ? <AccountEmptyState title="هنوز دیدگاهی ثبت نکرده‌اید" description="پس از خرید یا مشاهده محصول می‌توانید تجربه خود را با دیگران به اشتراک بگذارید." href="/account/reviews/pending" linkLabel="کالاهای در انتظار دیدگاه" /> : <section className="grid gap-3">{reviews.map((review) => <article key={review.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/products/${review.product.slug}`} className="text-sm font-black hover:text-[var(--brand-primary)]">{review.product.name}</Link><AdminStatusBadge tone={tones[review.status]}>{labels[review.status]}</AdminStatusBadge></div><div className="mt-3 flex items-center gap-1 text-amber-400" dir="ltr">{[1,2,3,4,5].map((value) => <Star key={value} size={16} className={value <= (review.rating ?? 0) ? "fill-current" : "text-slate-200"} />)}</div>{review.title && <strong className="mt-4 block text-sm">{review.title}</strong>}<p className="mb-0 mt-2 text-sm leading-7 text-[var(--muted)]">{review.body}</p><div className="mt-4 border-t border-dashed border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">ثبت‌شده در {formatDate(review.createdAt)}{review.moderationNote && review.status === "REJECTED" ? ` · دلیل: ${review.moderationNote}` : ""}</div></article>)}</section>}</>;
}
