import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { ColorForm } from "@/components/color-form";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function NewColorPage() {
  await requirePermission("catalog:manage");
  const brandSettings = await getBrandSettings();
  if (brandSettings.adminTemplate === "BLUEPRINT") redirect("/admin/colors");
  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ثبت رنگ جدید" description="نام، کد رنگ و ترتیب نمایش را تکمیل کنید." backHref="/admin/colors" backLabel="بازگشت به رنگ‌ها" />
    <ColorForm />
  </>;
}
