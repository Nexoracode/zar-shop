import { BlueprintBrandForm } from "@/components/admin/blueprint/brand-form";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

export default async function NewBrandPage() {
  await requirePermission("catalog:manage");
  return (
    <>
      <AdminPageHeader title="برند جدید" description="نام، نشانی انگلیسی و لوگوی برند را ثبت کنید." backHref="/admin/brands" backLabel="بازگشت به برندها" />
      <BlueprintBrandForm />
    </>
  );
}
