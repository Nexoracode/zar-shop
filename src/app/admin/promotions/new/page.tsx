import { AdminPromotions } from "@/components/admin-promotions";
import { BlueprintPromotionForm } from "@/components/admin/blueprint/promotion-form";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function NewPromotionPage() {
  await requirePermission("orders:manage");
  const brandSettings = await getBrandSettings();
  if (brandSettings.adminTemplate === "BLUEPRINT") return <BlueprintPromotionForm />;

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
