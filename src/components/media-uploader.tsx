"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MediaUploader() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const response = await fetch("/api/media", { method: "POST", body: new FormData(e.currentTarget) });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) { setMsg(result.message ?? "بارگذاری ناموفق بود."); return; }
    setMsg("فایل با موفقیت به گالری اضافه شد.");
    (e.currentTarget as HTMLFormElement).reset();
    router.refresh();
  }

  const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[#b5904c] focus:shadow-[0_0_0_3px_rgba(181,144,76,0.1)]";
  const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";

  return (
    <form
      className="grid gap-4 rounded-[4px] border border-[#e7e6e2] bg-white p-4 sm:p-[22px]"
      onSubmit={upload}
    >
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="mediaFile" className={labelClass}>تصویر یا ویدیو</label>
          <input
            id="mediaFile"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            required
            className={fieldClass}
          />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="mediaTitle" className={labelClass}>عنوان</label>
          <input id="mediaTitle" name="title" className={fieldClass} />
        </div>
      </div>

      {msg && (
        <div className={msg.includes("موفقیت")
          ? "text-[#28603a] bg-[#eaf7ee] px-3 py-[10px] text-[0.86rem]"
          : "text-[#a33b32] bg-[#fff0ed] px-3 py-[10px] text-[0.86rem]"
        }>
          {msg}
        </div>
      )}

      <button
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#1c3155] text-white border border-[#1c3155] rounded-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "در حال بارگذاری..." : "افزودن به گالری"}
      </button>
    </form>
  );
}
