import Image from "next/image";
import type { MediaAsset } from "@generated/prisma/client";
import { MediaUploader } from "@/components/media-uploader";
import { db } from "@/lib/db";

export default async function MediaPage() {
  const items = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">گالری رسانه</h1>
        <span className="text-sm text-[#747982]">کتابخانه مشترک تصاویر و ویدیوهای محصولات</span>
      </div>
      <MediaUploader />
      {items.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item: MediaAsset) => (
            <article className="min-w-0 overflow-hidden border border-[#e7e6e2] bg-white" key={item.id}>
              {item.type === "IMAGE" ? (
                <Image className="aspect-square h-auto w-full object-cover" src={item.url} alt={item.alt ?? item.title ?? "رسانه"} width={400} height={400} />
              ) : (
                <video className="aspect-square w-full bg-black object-cover" src={item.url} controls />
              )}
              <div className="truncate p-3 text-xs text-[#747982]">{item.title ?? item.storageKey}</div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 border border-dashed border-[#d9d4cb] bg-white py-12 text-center text-[#747982]">گالری هنوز خالی است.</div>
      )}
    </>
  );
}
