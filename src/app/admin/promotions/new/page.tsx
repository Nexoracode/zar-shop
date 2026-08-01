import { AdminPromotions } from "@/components/admin-promotions";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

export default async function NewPromotionPage() {
  await requirePermission("orders:manage");

  return (
    <>
      <AdminPageHeader
        eyebrow="بازاریابی و فروش"
        title="پروموشن جدید"
        description="نوع کمپین، شرایط استفاده و بازه اعتبار آن را مشخص کنید."
        backHref="/admin/promotions"
        backLabel="بازگشت به پروموشن‌ها"
      />
      <AdminPromotions mode="form" />
    </>
  );
}
