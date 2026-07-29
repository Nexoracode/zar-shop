import { AdminPromotions } from "@/components/admin-promotions";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { serializePromotion } from "@/modules/promotions/admin";

export default async function AdminPromotionsPage() {
  await requirePermission("orders:manage");
  const promotions = await db.promotion.findMany({
    include: { _count: { select: { redemptions: true, rewards: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="بازاریابی و فروش"
        title="پروموشن‌ها"
        description="مشوق‌های خرید، کدهای تخفیف و پیشنهادهای ویژه مشتریان را از یک محل تعریف و مدیریت کنید."
      />
      <AdminPromotions initialItems={promotions.map(serializePromotion)} />
    </>
  );
}
