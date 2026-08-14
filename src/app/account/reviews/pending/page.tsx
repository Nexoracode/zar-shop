import { AccountEmptyState, AccountProductCard } from "@/components/account-page-ui";
import { AccountReviewsPanel } from "@/components/account-reviews-panel";
import { PendingReviewButton } from "@/components/pending-review-button";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";

export default async function PendingReviewsPage() {
  const user = await requireUser();
  const items = await db.orderItem.findMany({ where: { productId: { not: null }, order: { userId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } }, product: { status: "ACTIVE", reviews: { none: { userId: user.id, parentId: null } } } }, distinct: ["productId"], orderBy: { order: { createdAt: "desc" } }, include: { product: { include: { category: true, media: { take: 1, orderBy: { position: "asc" }, include: { media: true } } } } } });
  const products = items.flatMap((item) => item.product ? [item.product] : []);
  return <AccountReviewsPanel active="pending">{!products.length ? <AccountEmptyState embedded title="کالایی در انتظار دیدگاه نیست" description="بعد از خرید موفق، کالاهایی که هنوز درباره‌شان نظر نداده‌اید در این صفحه نمایش داده می‌شوند." href="/account/reviews" linkLabel="مشاهده دیدگاه‌های شما" /> : <section className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3">{products.map((product) => <AccountProductCard key={product.id} item={{ id: product.id, name: product.name, slug: product.slug, category: product.category?.name ?? null, image: product.media[0] ? { url: product.media[0].media.url, alt: product.media[0].media.alt } : null }} action={<PendingReviewButton productId={product.id} productName={product.name} />} />)}</section>}</AccountReviewsPanel>;
}
