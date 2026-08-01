import { AdminPromotions } from "@/components/admin-promotions";
import { AdminBackLink, AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

export default async function NewPromotionPage() {
  await requirePermission("orders:manage");

  return (
    <>
      <AdminPageHeader
        eyebrow="بازاریابی و فروش"
        title="پروموشن جدید"
        description="نوع کمپین، شرایط استفاده و بازه اعتبار آن را مشخص کنید."
        action={<AdminBackLink href="/admin/promotions">بازگشت به پروموشن‌ها</AdminBackLink>}
      />
      <AdminPromotions mode="form" />
    </>
  );
}
