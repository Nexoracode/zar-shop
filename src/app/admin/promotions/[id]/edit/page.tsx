import { notFound } from "next/navigation";
import { AdminPromotions } from "@/components/admin-promotions";
import { AdminPageHeader } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { serializePromotion } from "@/modules/promotions/admin";

type Context = { params: Promise<{ id: string }> };

export default async function EditPromotionPage({ params }: Context) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const promotion = await db.promotion.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true, rewards: true } } },
  });

  if (!promotion) notFound();

  return (
    <>
      <AdminPageHeader
        eyebrow="بازاریابی و فروش"
        title="ویرایش پروموشن"
        description={`شرایط و وضعیت «${promotion.title}» را ویرایش کنید.`}
        backHref="/admin/promotions"
        backLabel="بازگشت به پروموشن‌ها"
      />
      <AdminPromotions mode="form" initialEditing={serializePromotion(promotion)} />
    </>
  );
}
