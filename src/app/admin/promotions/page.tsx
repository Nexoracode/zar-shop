import { AdminPromotions } from "@/components/admin-promotions";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

export default async function AdminPromotionsPage() {
  await requirePermission("orders:manage");

  return (
    <>
      <AdminPageHeader
        eyebrow="بازاریابی و فروش"
        title="پروموشن‌ها"
        description="مشوق‌های خرید، کدهای تخفیف و پیشنهادهای ویژه مشتریان را از یک محل تعریف و مدیریت کنید."
      />
      <AdminPromotions />
    </>
  );
}
