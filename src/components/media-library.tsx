"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Film, ImageIcon, Search, Trash2, TriangleAlert, UploadCloud } from "lucide-react";
import { Alert, Button, Card, Input, Spinner, toast } from "@heroui/react";
import { AdminEmptyState, adminFieldClass } from "@/components/admin-ui";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { MediaDetailsPanel, type MediaDetails } from "@/components/admin/media-details-panel";
import { useAdminTemplate } from "@/components/admin/template-context";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpDialog } from "@/components/admin/blueprint/ui/dialog";
import { BpSelect } from "@/components/admin/blueprint/ui/select";
import { mediaUsageCount, type MediaUsageCounts } from "@/modules/media/usage";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { readImageDimensions } from "@/modules/media/image-dimensions";

export type MediaScope = "CATEGORY" | "PRODUCT" | "HOMEPAGE" | "BRAND" | "PRODUCT_BRAND";
export type MediaChoice = {
  id: string;
  title: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  mimeType?: string;
  alt?: string | null;
};

type MediaItem = MediaChoice & {
  storageKey: string;
  caption?: string | null;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number;
  createdAt?: string;
  _count: MediaUsageCounts;
};

type Listing = { items: MediaItem[]; page: number; totalPages: number; totalItems: number };

const scopes: Array<{ value: MediaScope; label: string }> = [
  { value: "CATEGORY", label: "دسته‌بندی‌ها" },
  { value: "PRODUCT", label: "محصولات" },
  { value: "HOMEPAGE", label: "صفحه اصلی" },
  { value: "BRAND", label: "هویت بصری" },
  { value: "PRODUCT_BRAND", label: "برند محصول" },
];

const typeFilters = [
  { value: "", label: "همه فایل‌ها" },
  { value: "IMAGE", label: "تصویر" },
  { value: "VIDEO", label: "ویدیو" },
  { value: "DOCUMENT", label: "سند" },
];

export function MediaLibrary() {
  const template = useAdminTemplate();
  const blueprint = template === "BLUEPRINT";
  const [scope, setScope] = useState<MediaScope>("PRODUCT");
  const [typeFilter, setTypeFilter] = useState("");
  const [missingAltOnly, setMissingAltOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [listing, setListing] = useState<Listing>({ items: [], page: 1, totalPages: 1, totalItems: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  /** Any change to what is being looked for starts again from the first page. */
  function changeFilter(apply: () => void) {
    apply();
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ scope, page: String(page), pageSize: "48" });
      if (typeFilter) params.set("type", typeFilter);
      if (missingAltOnly) params.set("missingAlt", "1");
      if (debouncedQuery) params.set("q", debouncedQuery);
      const result = await requestJson<Listing>(`/api/media?${params.toString()}`, { cache: "no-store" }, { fallbackMessage: "دریافت گالری ناموفق بود." });
      setListing(result);
    } catch (reason) {
      setMessage(requestErrorMessage(reason, "ارتباط با گالری برقرار نشد."));
    } finally {
      setLoading(false);
    }
  }, [scope, page, typeFilter, missingAltOnly, debouncedQuery]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const selected = listing.items.find((item) => item.id === selectedId) ?? null;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.set("scope", scope);
      const meta: Array<Record<string, unknown>> = [];
      for (const file of Array.from(files)) {
        data.append("file", file);
        // Dimensions come from the browser: the project has no image-processing dependency, and
        // adding one to read two numbers is not worth it.
        meta.push({ ...(await readImageDimensions(file)) });
      }
      data.set("meta", JSON.stringify(meta));
      const result = await requestJson<{ items: MediaItem[] }>("/api/media", { method: "POST", body: data }, { fallbackMessage: "بارگذاری فایل ناموفق بود." });
      toast.success(`${result.items.length.toLocaleString("fa-IR")} فایل بارگذاری شد`, { description: "برای سئو، متن جایگزین هر تصویر را از پنل کناری کامل کنید." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPage(1);
      await load();
      // Land on the first new upload so its alt can be filled in straight away.
      if (result.items[0]) setSelectedId(result.items[0].id);
    } catch (reason) {
      setMessage(requestErrorMessage(reason, "بارگذاری فایل ناموفق بود."));
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: MediaItem) {
    setDeleting(true);
    try {
      await requestJson(`/api/media/${item.id}`, { method: "DELETE" }, { fallbackMessage: "حذف فایل ناموفق بود." });
      setPendingDelete(null);
      if (selectedId === item.id) setSelectedId(null);
      toast.success("فایل از گالری حذف شد");
      await load();
    } catch (reason) {
      setMessage(requestErrorMessage(reason, "حذف فایل ناموفق بود."));
    } finally {
      setDeleting(false);
    }
  }

  function applySaved(updated: MediaDetails) {
    const edited = { title: updated.title, alt: updated.alt, caption: updated.caption, description: updated.description };
    setListing((current) => ({
      ...current,
      items: current.items.map((item) => item.id === updated.id ? { ...item, ...edited } : item),
    }));
  }

  const toolbar = (
    <div className={`grid gap-3 ${blueprint ? "border border-[var(--bp-divider)] p-4" : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"}`}>
      <div className="flex flex-wrap gap-2">
        {scopes.map((item) => {
          const active = scope === item.value;
          return blueprint
            ? <BpButton key={item.value} size="sm" variant={active ? "primary" : "secondary"} onClick={() => changeFilter(() => setScope(item.value))}>{item.label}</BpButton>
            : <Button key={item.value} type="button" size="sm" variant={active ? "primary" : "secondary"} onPress={() => changeFilter(() => setScope(item.value))} className="min-h-9 rounded-lg px-4 text-xs">{item.label}</Button>;
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]" size={15} />
          {blueprint
            ? <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="جستجوی رسانه" placeholder="جستجو در عنوان و متن جایگزین..." className="bp-input bp-input-search" />
            : <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="جستجوی رسانه" fullWidth variant="secondary" placeholder="جستجو در عنوان و متن جایگزین..." className={`${adminFieldClass} px-10`} />}
        </div>
        {blueprint
          ? <BpSelect aria-label="نوع فایل" value={typeFilter} reserveMessage={false} options={typeFilters} onChange={(event) => changeFilter(() => setTypeFilter(event.target.value))} className="sm:w-40" />
          : <select aria-label="نوع فایل" value={typeFilter} onChange={(event) => changeFilter(() => setTypeFilter(event.target.value))} className={`${adminFieldClass} sm:w-40`}>{typeFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}
        {blueprint
          ? <BpButton size="sm" variant={missingAltOnly ? "primary" : "secondary"} onClick={() => changeFilter(() => setMissingAltOnly((current) => !current))} className="gap-2"><TriangleAlert size={14} />فقط بدون alt</BpButton>
          : <Button type="button" size="sm" variant={missingAltOnly ? "primary" : "secondary"} onPress={() => changeFilter(() => setMissingAltOnly((current) => !current))} className="min-h-10 gap-2 rounded-lg px-4 text-xs"><TriangleAlert size={14} />فقط بدون alt</Button>}
      </div>
      <label className={`grid cursor-pointer gap-1 ${blueprint ? "border border-dashed border-[var(--bp-divider)] p-3" : "rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-3"}`}>
        <span className="flex items-center gap-2 text-xs font-bold"><UploadCloud size={16} />{uploading ? "در حال بارگذاری..." : "بارگذاری فایل جدید"}</span>
        <span className={blueprint ? "bp-muted text-[11px]" : "text-[11px] text-[var(--muted)]"}>می‌توانید چند فایل را با هم انتخاب کنید؛ ابعاد تصاویر خودکار ثبت می‌شود.</span>
        <input ref={fileInputRef} type="file" multiple disabled={uploading} className="sr-only" onChange={(event) => void upload(event.target.files)} />
      </label>
      {message && (blueprint
        ? <p className="m-0 text-[12px] text-[var(--bp-danger)]">{message}</p>
        : <Alert status="danger"><Alert.Description>{message}</Alert.Description></Alert>)}
    </div>
  );

  const grid = loading ? (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className={`aspect-square animate-pulse ${blueprint ? "bg-[var(--bp-surface)]" : "rounded-xl bg-[var(--surface-tertiary)]"}`} />)}</div>
  ) : listing.items.length ? (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {listing.items.map((item) => {
        const active = item.id === selectedId;
        const noAlt = item.type === "IMAGE" && !item.alt;
        return (
          <div key={item.id} className={`relative flex min-w-0 flex-col ${blueprint ? `border ${active ? "border-[var(--bp-accent)]" : "border-[var(--bp-divider)]"}` : `overflow-hidden rounded-xl border-2 bg-white ${active ? "border-[var(--accent)]" : "border-[var(--border)]"}`}`}>
            <button type="button" onClick={() => setSelectedId(item.id)} aria-pressed={active} aria-label={`جزئیات ${item.title}`} className="block w-full cursor-pointer border-0 bg-transparent p-0 text-start">
              <span className={`relative block aspect-square w-full overflow-hidden ${blueprint ? "bg-[var(--bp-surface)]" : "bg-[var(--surface-tertiary)]"}`}>
                {item.type === "IMAGE"
                  ? <Image src={item.url} alt={item.alt ?? item.title} fill unoptimized={item.mimeType === "image/gif"} sizes="(max-width:640px) 50vw, 22vw" className="object-cover" />
                  : item.type === "VIDEO"
                    ? <><video src={item.url} muted className="h-full w-full bg-black object-cover" /><span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center bg-black/60 text-white"><Film size={13} /></span></>
                    : <span className="grid h-full place-items-center text-[var(--muted)]"><FileText size={30} /></span>}
                {noAlt && <span title="متن جایگزین ندارد" className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center bg-amber-500 text-white"><TriangleAlert size={13} /></span>}
              </span>
              <span className="block truncate px-2.5 py-2 text-[12px]">{item.title}</span>
            </button>
            {blueprint
              ? <BpButton size="sm" variant="ghost" fullWidth disabled={mediaUsageCount(item._count) > 0} onClick={() => setPendingDelete(item)} className="gap-1.5 border-t border-[var(--bp-divider)] text-[11px] text-[var(--bp-danger)]"><Trash2 size={12} />{mediaUsageCount(item._count) > 0 ? "در حال استفاده" : "حذف"}</BpButton>
              : <Button type="button" size="sm" variant="danger-soft" fullWidth isDisabled={mediaUsageCount(item._count) > 0} onPress={() => setPendingDelete(item)} className="min-h-9 gap-1.5 rounded-none border-t border-[var(--border)] text-[11px]"><Trash2 size={12} />{mediaUsageCount(item._count) > 0 ? "در حال استفاده" : "حذف"}</Button>}
          </div>
        );
      })}
    </div>
  ) : (
    <AdminEmptyState title={query || missingAltOnly ? "رسانه‌ای با این شرایط پیدا نشد" : "این بخش گالری خالی است"} description={query || missingAltOnly ? "فیلترها را تغییر دهید." : "اولین فایل را از نوار بالا بارگذاری کنید."} />
  );

  const pager = listing.totalPages > 1 && (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={blueprint ? "bp-muted" : "text-[var(--muted)]"}>{listing.totalItems.toLocaleString("fa-IR")} رسانه</span>
      <div className="flex items-center gap-2">
        {blueprint
          ? <><BpButton size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>قبلی</BpButton><span className="bp-muted">صفحه {listing.page.toLocaleString("fa-IR")} از {listing.totalPages.toLocaleString("fa-IR")}</span><BpButton size="sm" disabled={page >= listing.totalPages} onClick={() => setPage((current) => current + 1)}>بعدی</BpButton></>
          : <><Button type="button" size="sm" variant="secondary" isDisabled={page <= 1} onPress={() => setPage((current) => current - 1)} className="min-h-9 rounded-lg px-3">قبلی</Button><span className="text-[var(--muted)]">صفحه {listing.page.toLocaleString("fa-IR")} از {listing.totalPages.toLocaleString("fa-IR")}</span><Button type="button" size="sm" variant="secondary" isDisabled={page >= listing.totalPages} onPress={() => setPage((current) => current + 1)} className="min-h-9 rounded-lg px-3">بعدی</Button></>}
      </div>
    </div>
  );

  const body = (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4">
        {toolbar}
        {grid}
        {pager}
      </div>
      {selected
        ? <MediaDetailsPanel key={selected.id} media={{ ...selected, usageCount: mediaUsageCount(selected._count) }} onSaved={applySaved} className={blueprint ? "border border-[var(--bp-divider)] p-4 lg:sticky lg:top-24" : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:sticky lg:top-24"} />
        : <aside className={`grid place-items-center p-8 text-center ${blueprint ? "border border-dashed border-[var(--bp-divider)]" : "rounded-2xl border border-dashed border-[var(--border)]"}`}>
            <div>
              <ImageIcon className={`mx-auto mb-2 ${blueprint ? "text-[var(--bp-muted)]" : "text-[var(--muted)]"}`} size={30} />
              <strong className="block text-[13px]">یک رسانه را انتخاب کنید</strong>
              <span className={`mt-1 block text-[12px] ${blueprint ? "bp-muted" : "text-[var(--muted)]"}`}>متن جایگزین، عنوان و توضیحات آن اینجا قابل ویرایش است.</span>
            </div>
          </aside>}
    </div>
  );

  return <>
    {blueprint ? body : <Card variant="secondary" className="border-0 bg-transparent p-0 shadow-none">{body}</Card>}
    {blueprint ? (
      <BpDialog
        open={Boolean(pendingDelete)}
        title="حذف رسانه از گالری"
        description={`فایل «${pendingDelete?.title ?? ""}» از گالری و فضای FTP حذف می‌شود و امکان بازیابی آن وجود ندارد.`}
        onClose={() => { if (!deleting) setPendingDelete(null); }}
        actions={<>
          <BpButton disabled={deleting} onClick={() => setPendingDelete(null)}>انصراف</BpButton>
          <BpButton variant="danger" isPending={deleting} onClick={() => { if (pendingDelete) void remove(pendingDelete); }}>حذف فایل</BpButton>
        </>}
      />
    ) : (
      <DeleteConfirmDialog
        open={Boolean(pendingDelete)}
        itemName={pendingDelete?.title}
        description="این فایل از گالری و فضای FTP حذف می‌شود و امکان بازیابی آن وجود ندارد."
        loading={deleting}
        onClose={() => { if (!deleting) setPendingDelete(null); }}
        onConfirm={() => { if (pendingDelete) void remove(pendingDelete); }}
      />
    )}
    {uploading && <span className="sr-only" role="status"><Spinner size="sm" />در حال بارگذاری</span>}
  </>;
}
