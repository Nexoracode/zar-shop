import { Plus } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink } from "@/components/admin-ui";
import { ColorTable } from "@/components/color-table";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function ColorsPage() {
  await requirePermission("catalog:manage");
  const colors = await db.color.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="رنگ‌ها" description="رنگ‌های قابل انتخاب برای تنوع محصولات را تعریف و مدیریت کنید." action={<AdminPrimaryLink href="/admin/colors/new"><Plus size={17} />رنگ جدید</AdminPrimaryLink>} />
    <AdminPanel>
      {colors.length ? <ColorTable colors={colors} /> : <AdminEmptyState title="رنگی ثبت نشده" description="اولین رنگ فروشگاه را برای تعریف تنوع محصولات ثبت کنید." />}
    </AdminPanel>
  </>;
}
