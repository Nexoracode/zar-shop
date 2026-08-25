import { MediaLibrary } from "@/components/media-library";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

export default async function MediaPage() {
  await requirePermission("catalog:manage");
  return (
    <>
      <AdminPageHeader eyebrow="مدیریت فایل‌ها" title="گالری رسانه" description="بارگذاری، جستجو و ویرایش متن جایگزین و اطلاعات سئوی فایل‌های فروشگاه." />
      <MediaLibrary />
    </>
  );
}
