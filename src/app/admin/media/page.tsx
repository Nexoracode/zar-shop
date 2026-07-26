import { MediaLibrary } from "@/components/media-library";
import { AdminPageHeader } from "@/components/admin-ui";

export default function MediaPage() {
  return (
    <>
      <AdminPageHeader eyebrow="مدیریت فایل‌ها" title="گالری رسانه" description="تصاویر دسته‌بندی‌ها و تصاویر یا ویدیوهای محصولات را در فضای اختصاصی مدیریت کنید." />
      <MediaLibrary />
    </>
  );
}
