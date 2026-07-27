import { MediaLibrary } from "@/components/media-library";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

export default async function MediaPage() {
  await requirePermission("catalog:manage");
  return (
    <>
      <AdminPageHeader eyebrow="مدیریت فایل‌ها" title="گالری رسانه" description="تصاویر دسته‌بندی‌ها و تصاویر یا ویدیوهای محصولات را در فضای اختصاصی مدیریت کنید." />
      <MediaLibrary />
    </>
  );
}
