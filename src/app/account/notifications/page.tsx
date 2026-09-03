import { AccountEmptyState } from "@/components/account-page-ui";
import { AccountNotificationsPanel } from "@/components/account-notifications-panel";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { listForUser, pruneExpired } from "@/modules/notifications/service";

export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const user = await requireUser();
  await pruneExpired(db);
  const items = await listForUser(db, user.id, { limit: 100, joinedAt: user.createdAt });

  if (items.length === 0) {
    return (
      <AccountEmptyState
        title="اعلانی ندارید"
        description="پیشنهادها و کدهای تخفیف مخصوص شما اینجا نمایش داده می‌شوند."
        href="/products"
        linkLabel="مشاهدهٔ محصولات"
      />
    );
  }

  return <AccountNotificationsPanel items={items} />;
}
