import type { ReactNode } from "react";
import { AccountSidebar } from "@/components/account-sidebar";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [orders, addresses, favorites, reviews, visits, pendingItems] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.address.count({ where: { userId: user.id, type: "SHIPPING" } }),
    db.productFavorite.count({ where: { userId: user.id } }),
    db.productReview.count({ where: { userId: user.id, parentId: null } }),
    db.productVisit.count({ where: { userId: user.id } }),
    db.orderItem.findMany({ where: { productId: { not: null }, order: { userId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } }, product: { reviews: { none: { userId: user.id, parentId: null } } } }, distinct: ["productId"], select: { productId: true } }),
  ]);
  const name = user.isGuest ? "خریدار مهمان" : `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  return <main className="bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-10" dir="rtl"><div className="mx-auto grid w-full max-w-[1280px] items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><AccountSidebar user={{ name, phone: user.phone ?? user.email }} counts={{ orders, addresses, favorites, reviews, visits, pendingReviews: pendingItems.length }} /><div className="grid min-w-0 gap-5">{children}</div></div></main>;
}
