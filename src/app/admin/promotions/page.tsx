import { AdminPromotions } from "@/components/admin-promotions";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { serializePromotion } from "@/modules/promotions/admin";
import { Plus } from "lucide-react";

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
        description="وضعیت، بازه اعتبار و میزان استفاده از کمپین‌های فروش را مدیریت کنید."
        action={<AdminPrimaryLink href="/admin/promotions/new"><Plus size={17} />پروموشن جدید</AdminPrimaryLink>}
      />
      <AdminPromotions mode="list" initialItems={promotions.map(serializePromotion)} />
    </>
  );
}
