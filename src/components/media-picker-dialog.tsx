"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaChoice, MediaScope } from "@/components/media-library";

type PickerItem = MediaChoice & { _count: { products: number; categories: number } };

type Props = {
  open: boolean;
  scope: MediaScope;
  multiple?: boolean;
  selected: MediaChoice[];
  onClose: () => void;
  onConfirm: (items: MediaChoice[]) => void;
};

export function MediaPickerDialog({ open, scope, multiple = false, selected, onClose, onConfirm }: Props) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [draft, setDraft] = useState<MediaChoice[]>(selected);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/media?scope=${scope}&limit=200`, { cache: "no-store", signal });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "دریافت گالری ناموفق بود.");
      setItems(result.items.map((item: PickerItem) => ({ ...item, title: item.title || "رسانه" })));
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "ارتباط با گالری برقرار نشد.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setDraft(selected);
      setQuery("");
      void load(controller.signal);
    });
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { controller.abort(); document.body.style.overflow = previousOverflow; };
  }, [open, selected, load]);

  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [open, onClose]);

  function toggle(item: MediaChoice) {
    if (!multiple) { setDraft([item]); return; }
    setDraft((current) => current.some((chosen) => chosen.id === item.id) ? current.filter((chosen) => chosen.id !== item.id) : [...current, item]);
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError("");
    try {
      const form = event.currentTarget;
      const data = new FormData(form);
      data.set("scope", scope);
      const response = await fetch("/api/media", { method: "POST", body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "بارگذاری فایل ناموفق بود.");
      form.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "بارگذاری فایل ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: PickerItem) {
    const usage = item._count.products + item._count.categories;
    if (usage) { setError("این رسانه در حال استفاده است؛ ابتدا آن را از محصول یا دسته‌بندی مربوط جدا کنید."); return; }
    if (!window.confirm(`فایل «${item.title}» از گالری و FTP حذف شود؟`)) return;
    setDeletingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف فایل ناموفق بود.");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setDraft((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حذف فایل ناموفق بود.");
    } finally {
      setDeletingId(null);
    }
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa-IR");
    return normalized ? items.filter((item) => item.title.toLocaleLowerCase("fa-IR").includes(normalized)) : items;
  }, [items, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0d1728]/65 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="media-picker-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:rounded-sm">
        <div className="flex items-center justify-between border-b border-[#e7e6e2] px-4 py-4 sm:px-6">
          <div><h2 id="media-picker-title" className="m-0 text-lg">انتخاب از گالری {scope === "CATEGORY" ? "دسته‌بندی" : "محصول"}</h2><span className="text-xs text-[#747982]">{multiple ? "می‌توانید چند رسانه انتخاب کنید؛ اولین مورد تصویر اصلی است." : "یک تصویر را انتخاب کنید."}</span></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="بستن گالری" className="h-10 w-10 text-2xl text-[#747982]">×</button>
        </div>
        <div className="min-h-56 flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={upload} className="mb-4 grid gap-3 rounded-sm border border-[#e7e6e2] bg-[#faf9f6] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-bold text-[#4b5160]">بارگذاری مستقیم در همین گالری<input name="file" type="file" required accept={scope === "CATEGORY" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/webm"} className="w-full border border-[#d9d4cb] bg-white px-3 py-2 text-xs" /></label>
            <button disabled={uploading} className="min-h-10 bg-[#b5904c] px-5 text-sm text-white disabled:opacity-60">{uploading ? "در حال بارگذاری..." : "بارگذاری"}</button>
          </form>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو در عنوان فایل‌ها..." className="mb-4 w-full border border-[#e7e6e2] px-3 py-2.5 text-sm outline-none focus:border-[#b5904c]" />
          {error && <div className="mb-4 rounded-sm bg-[#fff0ed] px-3 py-2 text-sm text-[#a33b32]">{error}</div>}
          {loading ? <div className="py-16 text-center text-sm text-[#747982]">در حال دریافت تصاویر...</div> : visibleItems.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleItems.map((item) => {
                const chosenIndex = draft.findIndex((chosen) => chosen.id === item.id);
                const usage = item._count.products + item._count.categories;
                return <div key={item.id} className={`relative overflow-hidden border-2 ${chosenIndex >= 0 ? "border-[#b5904c]" : "border-transparent"}`}>
                  <button type="button" onClick={() => toggle(item)} className="block w-full text-right focus-visible:outline-2 focus-visible:outline-[#1c3155]" aria-pressed={chosenIndex >= 0}>
                  <div className="relative aspect-square bg-[#f5f3ee]">{item.type === "IMAGE" ? <Image src={item.url} alt={item.title} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover" /> : <video src={item.url} muted className="h-full w-full bg-black object-cover" />}</div>
                  <span className="block truncate px-2 py-2 text-xs">{item.title}</span>
                  {chosenIndex >= 0 && <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#b5904c] px-2 text-xs text-white">{multiple ? (chosenIndex + 1).toLocaleString("fa-IR") : "✓"}</span>}
                  </button>
                  <button type="button" disabled={deletingId === item.id || usage > 0} onClick={() => void remove(item)} className="w-full border-t border-[#eeeae2] bg-white px-2 py-2 text-xs text-[#a33b32] disabled:cursor-not-allowed disabled:text-[#aaa]">{usage ? `${usage.toLocaleString("fa-IR")} مورد استفاده` : deletingId === item.id ? "در حال حذف..." : "حذف از گالری"}</button>
                </div>;
              })}
            </div>
          ) : <div className="py-16 text-center text-sm text-[#747982]">{query ? "رسانه‌ای با این عنوان پیدا نشد." : "این بخش از گالری هنوز خالی است؛ از فرم بالا بارگذاری کنید."}</div>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#e7e6e2] p-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} className="min-h-11 border border-[#d9d4cb] px-6 text-sm">انصراف</button>
          <button type="button" onClick={() => { onConfirm(draft); onClose(); }} className="min-h-11 bg-[#1c3155] px-6 text-sm text-white">تأیید انتخاب ({draft.length.toLocaleString("fa-IR")})</button>
        </div>
      </div>
    </div>
  );
}
