import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintPackagingBoxForm } from "@/components/admin/blueprint/packaging-box-form";
import { requirePermission } from "@/modules/auth/session";

export default async function NewPackagingBoxPage() {
  await requirePermission("settings:manage");
  return <>
    <AdminPageHeader
      eyebrow="بسته‌بندی"
      title="افزودن جعبه"
      description="اندازه، وزن و ظرفیت جعبه ارسال را تعریف کنید."
      backHref="/admin/packaging"
      backLabel="بازگشت به بسته‌بندی"
    />
    <BlueprintPackagingBoxForm />
  </>;
}
