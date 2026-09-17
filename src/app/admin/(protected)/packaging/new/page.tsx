import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintPackagingBoxForm } from "@/components/admin/blueprint/packaging-box-form";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
