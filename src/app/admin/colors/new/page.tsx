import { AdminPageHeader } from "@/components/admin-ui";
import { ColorForm } from "@/components/color-form";
import { requirePermission } from "@/modules/auth/session";

export default async function NewColorPage() {
  await requirePermission("catalog:manage");
  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ثبت رنگ جدید" description="نام، کد رنگ و ترتیب نمایش را تکمیل کنید." backHref="/admin/colors" backLabel="بازگشت به رنگ‌ها" />
    <ColorForm />
  </>;
}
