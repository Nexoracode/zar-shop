"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export type MediaScope = "CATEGORY" | "PRODUCT";
export type MediaChoice = {
  id: string;
  title: string;
  url: string;
  type: "IMAGE" | "VIDEO";
};

type MediaItem = MediaChoice & {
  storageKey: string;
  _count: { products: number; categories: number };
};

const fieldClass = "w-full rounded-sm border border-[#e7e6e2] bg-white px-3 py-3 outline-none focus:border-[#b5904c] focus:ring-2 focus:ring-[#b5904c]/10";

export function MediaLibrary() {
  const [scope, setScope] = useState<MediaScope>("CATEGORY");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/media?scope=${scope}&limit=200`, { cache: "no-store" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "دریافت گالری ناموفق بود.");
      setItems(result.items);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "ارتباط با گالری برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("scope", scope);
    try {
      const response = await fetch("/api/media", { method: "POST", body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "بارگذاری ناموفق بود.");
      form.reset();
      await load();
      setMessage("فایل با موفقیت در گالری ذخیره شد.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "بارگذاری فایل ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`فایل «${item.title}» از گالری و فضای FTP حذف شود؟`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف فایل ناموفق بود.");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setMessage("فایل با موفقیت حذف شد.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "حذف فایل ناموفق بود.");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-[#e7e6e2] bg-white p-1">
        {(["CATEGORY", "PRODUCT"] as const).map((value) => (
          <button key={value} type="button" onClick={() => { setLoading(true); setMessage(""); setScope(value); }} className={`min-h-11 px-3 text-sm transition ${scope === value ? "bg-[#1c3155] text-white" : "text-[#4b5160] hover:bg-[#f6f3ed]"}`}>
            {value === "CATEGORY" ? "تصاویر دسته‌بندی" : "رسانه محصولات"}
          </button>
        ))}
      </div>

      <form onSubmit={upload} className="grid gap-4 rounded-sm border border-[#e7e6e2] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <label className="grid gap-1.5 text-xs font-bold text-[#4b5160]">
          {scope === "CATEGORY" ? "تصویر دسته‌بندی" : "تصویر یا ویدیوی محصول"}
          <input name="file" type="file" required accept={scope === "CATEGORY" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/webm"} className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-[#4b5160]">عنوان فایل<input name="title" className={fieldClass} /></label>
        <button disabled={uploading} className="min-h-[46px] bg-[#b5904c] px-6 text-sm text-white disabled:opacity-60">{uploading ? "در حال بارگذاری..." : "بارگذاری در FTP"}</button>
      </form>

      {message && <div className="rounded-sm border border-[#e3d5ba] bg-[#fffaf0] px-4 py-3 text-sm text-[#785b27]">{message}</div>}

      {loading ? <div className="py-14 text-center text-sm text-[#747982]">در حال دریافت گالری...</div> : items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const usage = item._count.products + item._count.categories;
            return (
              <article key={item.id} className="min-w-0 overflow-hidden border border-[#e7e6e2] bg-white">
                <div className="relative aspect-square bg-[#f5f3ee]">
                  {item.type === "IMAGE" ? <Image src={item.url} alt={item.title} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover" /> : <video src={item.url} controls className="h-full w-full bg-black object-cover" />}
                </div>
                <div className="grid gap-2 p-3">
                  <strong className="truncate text-xs">{item.title}</strong>
                  <div className="flex items-center justify-between gap-2 text-[0.68rem] text-[#747982]"><span>{usage ? `${usage.toLocaleString("fa-IR")} مورد استفاده` : "بدون استفاده"}</span><button type="button" disabled={usage > 0} title={usage ? "ابتدا رسانه را از محصول یا دسته‌بندی جدا کنید" : undefined} onClick={() => void remove(item)} className="text-[#a33b32] disabled:cursor-not-allowed disabled:text-[#aaa]">{usage ? "قابل حذف نیست" : "حذف"}</button></div>
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="border border-dashed border-[#d9d4cb] bg-white py-14 text-center text-sm text-[#747982]">این بخش از گالری هنوز خالی است.</div>}
    </div>
  );
}
