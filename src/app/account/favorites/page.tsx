import { AccountEmptyState, AccountProductCard } from "@/components/account-page-ui";
import { FavoriteRemoveButton } from "@/components/favorite-remove-button";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";

export default async function FavoritesPage() {
  const user = await requireUser();
  const favorites = await db.productFavorite.findMany({ where: { userId: user.id, product: { status: "ACTIVE" } }, orderBy: { createdAt: "desc" }, include: { product: { include: { category: true, media: { take: 1, orderBy: { position: "asc" }, include: { media: true } } } } } });
  return !favorites.length ? <AccountEmptyState title="فهرست علاقه‌مندی شما خالی است" description="با انتخاب آیکن قلب در صفحه محصول، کالا را اینجا ذخیره کنید." /> : <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{favorites.map(({ product }) => <AccountProductCard key={product.id} item={{ id: product.id, name: product.name, slug: product.slug, category: product.category?.name ?? null, image: product.media[0] ? { url: product.media[0].media.url, alt: product.media[0].media.alt } : null }} action={<FavoriteRemoveButton productId={product.id} />} />)}</section>;
}
