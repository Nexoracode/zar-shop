import Image from "next/image";
import Link from "next/link";
import { ImageIcon, Star } from "lucide-react";
import { AccountEmptyState } from "@/components/account-page-ui";
import { AccountReviewsPanel } from "@/components/account-reviews-panel";
import { AdminStatusBadge } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";

const tones = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;
const labels = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;

export default async function ReviewsPage() {
  const user = await requireUser();
  const reviews = await db.productReview.findMany({ where: { userId: user.id, parentId: null }, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, slug: true, media: { take: 1, orderBy: { position: "asc" }, include: { media: true } } } } } });
  return <AccountReviewsPanel active="reviews">{!reviews.length ? <AccountEmptyState embedded title="هنوز دیدگاهی ثبت نکرده‌اید" description="پس از خرید یا مشاهده محصول می‌توانید تجربه خود را با دیگران به اشتراک بگذارید." href="/account/reviews/pending" linkLabel="کالاهای در انتظار دیدگاه" /> : <div className="divide-y divide-[var(--border)] px-5">{reviews.map((review) => { const media = review.product.media[0]?.media; return <article key={review.id} className="py-6"><div className="flex items-start gap-4"><Link href={`/products/${review.product.slug}`} className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50">{media?.type === "IMAGE" ? <Image src={media.url} alt={media.alt ?? review.product.name} fill sizes="64px" className="object-contain p-1" /> : <ImageIcon size={26} className="text-slate-300" />}</Link><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><Link href={`/products/${review.product.slug}`} className="text-sm font-black leading-7 hover:text-[var(--brand-primary)]">{review.product.name}</Link><AdminStatusBadge tone={tones[review.status]}>{labels[review.status]}</AdminStatusBadge></div><div className="mt-3 flex items-center gap-1 text-amber-400" dir="ltr">{[1,2,3,4,5].map((value) => <Star key={value} size={20} className={value <= (review.rating ?? 0) ? "fill-current" : "text-slate-200"} />)}</div></div></div>{review.title && <strong className="mt-5 block text-sm">{review.title}</strong>}<p className="mb-0 mt-3 text-sm leading-8 text-slate-700">{review.body}</p><div className="mt-5 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">ثبت‌شده در {formatDate(review.createdAt)}{review.isVerifiedPurchase ? " · خریدار محصول" : ""}{review.moderationNote && review.status === "REJECTED" ? ` · دلیل: ${review.moderationNote}` : ""}</div></article>; })}</div>}</AccountReviewsPanel>;
}
