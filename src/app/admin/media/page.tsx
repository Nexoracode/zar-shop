import { MediaLibrary } from "@/components/media-library";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function MediaPage() {
  await requirePermission("catalog:manage");
  return (
    <>
      <AdminPageHeader eyebrow="مدیریت فایل‌ها" title="گالری رسانه" description="بارگذاری، جستجو و ویرایش متن جایگزین و اطلاعات سئوی فایل‌های فروشگاه." />
      <MediaLibrary />
    </>
  );
}
