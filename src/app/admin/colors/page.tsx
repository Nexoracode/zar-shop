import { AdminPageHeader } from "@/components/admin-ui";
import { ColorManager } from "@/components/color-manager";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function ColorsPage() {
  await requirePermission("catalog:manage");
  const colors = await db.color.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="رنگ‌ها" description="رنگ‌های قابل انتخاب برای تنوع محصولات را تعریف و مدیریت کنید." />
    <ColorManager initialColors={colors} />
  </>;
}
