import { MediaLibrary } from "@/components/media-library";

export default function MediaPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">گالری رسانه</h1>
        <span className="text-sm text-[#747982]">مدیریت جداگانه تصاویر دسته‌بندی‌ها و تصاویر یا ویدیوهای محصولات</span>
      </div>
      <MediaLibrary />
    </>
  );
}
