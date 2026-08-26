import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { ColorForm } from "@/components/color-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

type Context = { params: Promise<{ id: string }> };

export default async function EditColorPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const brandSettings = await getBrandSettings();
  if (brandSettings.adminTemplate === "BLUEPRINT") redirect("/admin/colors");
  const { id } = await params;
  const color = await db.color.findUnique({ where: { id } });
  if (!color) notFound();
  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title={`ویرایش «${color.name}»`} description="نام، کد رنگ و ترتیب نمایش این رنگ را به‌روزرسانی کنید." backHref="/admin/colors" backLabel="بازگشت به رنگ‌ها" />
    <ColorForm color={{ id: color.id, name: color.name, hex: color.hex, isActive: color.isActive, sortOrder: color.sortOrder }} />
  </>;
}
