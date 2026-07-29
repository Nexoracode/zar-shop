"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Search, Trash2, UploadCloud } from "lucide-react";
import { Alert, Button, Card, Input, Spinner, toast } from "@heroui/react";
import { AdminEmptyState, adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

export type MediaScope = "CATEGORY" | "PRODUCT";
export type MediaChoice = {
  id: string;
  title: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
};

type MediaItem = MediaChoice & {
  storageKey: string;
  _count: { products: number; optionGuideProducts: number; categories: number };
};

const fieldClass = adminFieldClass;

export function MediaLibrary() {
  const [scope, setScope] = useState<MediaScope>("CATEGORY");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [message, setMessage] = useState("");
  const filteredItems = useMemo(() => items.filter((item) => item.title.toLocaleLowerCase("fa").includes(query.trim().toLocaleLowerCase("fa"))), [items, query]);

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

    const uploadPromise = (async () => {
      const response = await fetch("/api/media", { method: "POST", body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "بارگذاری ناموفق بود.");
      const uploadedCount = Array.isArray(result?.items) ? result.items.length : 0;
      form.reset();
      await load();
      return uploadedCount;
    })();

    toast.promise(uploadPromise, {
      loading: "فایل‌ها در حال بارگذاری هستند...",
      success: (uploadedCount) => `${uploadedCount.toLocaleString("fa-IR")} فایل با موفقیت در گالری ذخیره شد`,
      error: (reason) => reason.message || "بارگذاری فایل ناموفق بود",
    });

    try {
      await uploadPromise;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "بارگذاری فایل ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: MediaItem) {
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف فایل ناموفق بود.");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      toast.success("فایل از گالری حذف شد", { description: `فایل «${item.title}» با موفقیت حذف شد.`, timeout: 4000 });
      setPendingDelete(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "حذف فایل ناموفق بود.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex w-fit max-w-full justify-self-start gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {(["CATEGORY", "PRODUCT"] as const).map((value) => (
          <Button key={value} type="button" onPress={() => { setLoading(true); setMessage(""); setScope(value); }} variant={scope === value ? "primary" : "ghost"} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold ${scope === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-600"}`}>
            {value === "CATEGORY" ? "تصاویر دسته‌بندی" : "رسانه محصولات"}
          </Button>
        ))}
      </div>

      <form onSubmit={upload} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <label className={adminLabelClass}>
          {scope === "CATEGORY" ? "تصویر دسته‌بندی" : "تصویر، ویدیو یا PDF محصول"}
          <Input name="file" type="file" multiple required fullWidth variant="secondary" accept={scope === "CATEGORY" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf"} className={fieldClass} />
        </label>
        <label className={adminLabelClass}>عنوان فایل<Input name="title" fullWidth variant="secondary" className={fieldClass} placeholder="مثلاً نمای روبه‌روی محصول" /></label>
        <Button type="submit" isPending={uploading} variant="primary" className="min-h-[46px] gap-2 rounded-xl bg-amber-600 px-6 text-sm font-bold text-white">
          {({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <UploadCloud className="size-4" />}{isPending ? "در حال بارگذاری..." : "بارگذاری در FTP"}</>}
        </Button>
      </form>

      {message && <Alert status="warning"><Alert.Description>{message}</Alert.Description></Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-slate-900">فایل‌های گالری</h2><p className="text-xs text-slate-500">{items.length.toLocaleString("fa-IR")} فایل در این بخش</p></div><div className="relative sm:w-72"><Search className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} fullWidth variant="secondary" className={`${fieldClass} pr-10`} placeholder="جست‌وجوی عنوان فایل..." /></div></div>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">در حال دریافت گالری...</div> : filteredItems.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const usage = item._count.products + item._count.optionGuideProducts + item._count.categories;
            return (
              <Card key={item.id} variant="secondary" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-square bg-[#f5f3ee]">
                  {item.type === "IMAGE" ? <Image src={item.url} alt={item.title} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover" /> : item.type === "VIDEO" ? <video src={item.url} controls className="h-full w-full bg-black object-cover" /> : <a href={item.url} target="_blank" rel="noreferrer" className="grid h-full place-items-center text-slate-500"><span className="grid justify-items-center gap-2 text-xs font-bold"><FileText size={38} className="text-[#9a7434]" />فایل PDF</span></a>}
                </div>
                <div className="grid gap-2 p-3">
                  <strong className="truncate text-xs">{item.title}</strong>
                  <div className="flex items-center justify-between gap-2 text-[0.68rem] text-slate-500"><span>{usage ? `${usage.toLocaleString("fa-IR")} مورد استفاده` : "بدون استفاده"}</span><Button type="button" size="sm" variant="danger-soft" isDisabled={usage > 0 || deleting} aria-label={usage ? "ابتدا رسانه را از محصول یا دسته‌بندی جدا کنید" : "حذف رسانه"} onPress={() => setPendingDelete(item)} className="h-8 min-h-8 gap-1 px-2 text-xs font-bold"><Trash2 className="size-3.5" />{usage ? "در حال استفاده" : "حذف"}</Button></div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : <AdminEmptyState title={query ? "فایلی پیدا نشد" : "این گالری هنوز خالی است"} description={query ? "عبارت جست‌وجو را تغییر دهید." : "اولین فایل را از فرم بالا بارگذاری کنید."} />}
      <DeleteConfirmDialog
        open={Boolean(pendingDelete)}
        itemName={pendingDelete?.title}
        description="این فایل از گالری و فضای FTP حذف می‌شود و امکان بازیابی آن وجود ندارد."
        loading={deleting}
        onClose={() => { if (!deleting) setPendingDelete(null); }}
        onConfirm={() => { if (pendingDelete) void remove(pendingDelete); }}
      />
    </div>
  );
}
