import { formatDate } from "@/lib/format";
import { AccountEmptyState, AccountProductCard } from "@/components/account-page-ui";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";

export default async function RecentVisitsPage() {
  const user = await requireUser();
  const visits = await db.productVisit.findMany({ where: { userId: user.id, product: { status: "ACTIVE" } }, orderBy: { visitedAt: "desc" }, take: 60, include: { product: { include: { category: true, media: { take: 1, orderBy: { position: "asc" }, include: { media: true } } } } } });
  return !visits.length ? <AccountEmptyState title="هنوز بازدیدی ثبت نشده است" description="محصولاتی که مشاهده می‌کنید به ترتیب آخرین بازدید در این صفحه قرار می‌گیرند." /> : <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{visits.map(({ product, visitedAt, visitCount }) => <AccountProductCard key={product.id} item={{ id: product.id, name: product.name, slug: product.slug, category: product.category?.name ?? null, image: product.media[0] ? { url: product.media[0].media.url, alt: product.media[0].media.alt } : null }} meta={<span>{formatDate(visitedAt)} · {visitCount.toLocaleString("fa-IR")} بازدید</span>} />)}</section>;
}
