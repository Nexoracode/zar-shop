"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Card, Input, Modal, Spinner, toast } from "@heroui/react";
import { Check, FileText, Film, ImageIcon, RefreshCw, Search, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import type { MediaChoice, MediaScope } from "@/components/media-library";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useAdminTemplate } from "@/components/admin/template-context";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpDialog, lockBodyScroll, unlockBodyScroll } from "@/components/admin/blueprint/ui/dialog";
import { MediaDetailsPanel, type MediaDetails } from "@/components/admin/media-details-panel";
import { mediaUsageCount, type MediaUsageCounts } from "@/modules/media/usage";
import { readImageDimensions } from "@/modules/media/image-dimensions";
import { uploadMediaFile } from "@/modules/media/upload-file";

type PickerItem = MediaChoice & {
  caption?: string | null;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number;
  createdAt?: string;
  _count: MediaUsageCounts;
};
type UploadEntry = { name: string; status: "pending" | "uploading" | "done" | "error"; percent: number; error?: string };
type Props = { open: boolean; scope: MediaScope; multiple?: boolean; allowedTypes?: MediaChoice["type"][]; selected: MediaChoice[]; onClose: () => void; onConfirm: (items: MediaChoice[]) => void };

export function MediaPickerDialog({ open, scope, multiple = false, allowedTypes, selected, onClose, onConfirm }: Props) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [draft, setDraft] = useState<MediaChoice[]>(selected);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PickerItem | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [uploadQueue, setUploadQueue] = useState<UploadEntry[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const template = useAdminTemplate();

  const scopeLabel = scope === "CATEGORY" ? "دسته‌بندی" : scope === "HOMEPAGE" ? "صفحه اصلی" : scope === "BRAND" ? "هویت بصری" : "محصول";
  const allowedTypeKey = (allowedTypes ?? (scope === "CATEGORY" ? ["IMAGE"] : ["IMAGE", "VIDEO"])).join(",");
  const acceptedFiles = allowedTypeKey.includes("DOCUMENT")
    ? "image/jpeg,image/png,image/webp,application/pdf"
    : scope === "HOMEPAGE" ? "image/jpeg,image/png,image/webp,image/gif" : scope === "CATEGORY" || scope === "BRAND" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/webm";

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/media?scope=${scope}&pageSize=100`, { cache: "no-store", signal });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "دریافت گالری ناموفق بود.");
      setItems(result.items.map((item: PickerItem) => ({ ...item, title: item.title || "رسانه بدون عنوان" })));
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
      if (!controller.signal.aborted) {
        setDraft(selected);
        setQuery("");
        setTab("library");
        setUploadQueue([]);
        // Without this the details pane reopens on whatever was inspected last time.
        setDetailsId(null);
        void load(controller.signal);
      }
    });
    return () => controller.abort();
  }, [open, selected, load]);

  useEffect(() => {
    if (!open || template !== "BLUEPRINT") return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape" && !pendingDelete) onClose(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, template, pendingDelete, onClose]);

  // This gallery is its own full-screen overlay, not `BpDialog` content, so it shares that
  // component's scroll-lock counter directly instead of going without one.
  useEffect(() => {
    if (!open || template !== "BLUEPRINT") return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [open, template]);

  function toggle(item: MediaChoice) {
    if (!multiple) {
      setDraft((current) => current[0]?.id === item.id ? [] : [item]);
      return;
    }
    setDraft((current) => current.some((chosen) => chosen.id === item.id) ? current.filter((chosen) => chosen.id !== item.id) : [...current, item]);
  }

  /*
   * Files go up one at a time rather than as a single multi-file request. That is what lets the
   * panel say which image is on the wire and how far it has got, and it keeps one rejected file
   * from taking the rest of the batch down with it.
   */
  async function startUpload(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files);
    setUploading(true);
    setError("");
    setTab("upload");
    setUploadQueue(chosen.map((file) => ({ name: file.name, status: "pending", percent: 0 })));

    const succeeded: MediaChoice[] = [];
    for (const [index, file] of chosen.entries()) {
      setUploadQueue((current) => current.map((entry, position) => position === index ? { ...entry, status: "uploading" } : entry));
      try {
        const dimensions = await readImageDimensions(file);
        const created = await uploadMediaFile(file, scope, dimensions, (progress) => {
          setUploadQueue((current) => current.map((entry, position) => position === index ? { ...entry, percent: progress.percent } : entry));
        });
        succeeded.push(created);
        setUploadQueue((current) => current.map((entry, position) => position === index ? { ...entry, status: "done", percent: 100 } : entry));
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "بارگذاری فایل انجام نشد.";
        setUploadQueue((current) => current.map((entry, position) => position === index ? { ...entry, status: "error", error: message } : entry));
      }
    }

    if (uploadInputRef.current) uploadInputRef.current.value = "";
    await load();
    if (succeeded.length) {
      setDraft((current) => multiple ? [...current, ...succeeded.filter((item) => !current.some((chosenItem) => chosenItem.id === item.id))] : [succeeded[0]]);
      setDetailsId(succeeded[0].id);
      toast.success(`${succeeded.length.toLocaleString("fa-IR")} فایل بارگذاری شد`, { description: "برای سئو، متن جایگزین هر تصویر را از تب کتابخانه کامل کنید." });
    }
    const failed = chosen.length - succeeded.length;
    if (failed) setError(`${failed.toLocaleString("fa-IR")} فایل بارگذاری نشد؛ جزئیات هر مورد در فهرست بالا آمده است.`);
    setUploading(false);
  }

  /** The classic dialog still submits a form; it hands the same files to the queue above. */
  async function uploadFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    await startUpload(input?.files ?? null);
    setUploadFileName("");
    event.currentTarget.reset();
  }

  async function remove(item: PickerItem) {
    if (mediaUsageCount(item._count)) {
      setError("این رسانه در حال استفاده است؛ ابتدا آن را از محصول یا دسته‌بندی مربوط جدا کنید.");
      return;
    }
    setDeletingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف فایل ناموفق بود.");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setDraft((current) => current.filter((candidate) => candidate.id !== item.id));
      setPendingDelete(null);
      toast.success("فایل از گالری حذف شد", { description: `فایل «${item.title}» با موفقیت حذف شد.`, timeout: 4000 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حذف فایل ناموفق بود.");
    } finally {
      setDeletingId(null);
    }
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa-IR");
    const permitted = new Set(allowedTypeKey.split(","));
    return items.filter((item) => permitted.has(item.type) && (!normalized || item.title.toLocaleLowerCase("fa-IR").includes(normalized)));
  }, [allowedTypeKey, items, query]);

  function confirm() {
    onConfirm(draft);
    onClose();
  }

  const headline = multiple
    ? "چند رسانه انتخاب کنید؛ مورد اول تصویر شاخص خواهد بود."
    : allowedTypeKey.includes("DOCUMENT")
      ? "یک تصویر یا فایل PDF را به‌عنوان راهنمای سایز انتخاب کنید."
      : "یک تصویر را به‌عنوان تصویر شاخص انتخاب کنید.";

  const detailsItem = items.find((item) => item.id === detailsId) ?? null;
  const doneCount = uploadQueue.filter((entry) => entry.status === "done").length;

  function applySaved(updated: MediaDetails) {
    const edited = { title: updated.title, alt: updated.alt, caption: updated.caption, description: updated.description };
    setItems((current) => current.map((item) => item.id === updated.id ? { ...item, ...edited } : item));
  }

  if (template === "BLUEPRINT") {
    if (!open) return null;
    return (
      <div
        dir="rtl"
        className="bp-root fixed inset-0 z-[130] flex flex-col bg-[var(--bp-bg)]"
        onMouseDown={(event) => { if (event.target === event.currentTarget && !pendingDelete) onClose(); }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--bp-divider)] px-4 py-3 sm:px-6" onMouseDown={(event) => event.stopPropagation()}>
          <div className="min-w-0">
            <strong className="block truncate text-[17px] font-bold">گالری {scopeLabel}</strong>
            <span className="bp-muted block truncate text-[12px]">{headline}</span>
          </div>
          <BpButton isIconOnly aria-label="بستن گالری" onClick={onClose}><X size={17} /></BpButton>
        </header>

        <div className="border-b border-[var(--bp-divider)] px-4 sm:px-6" onMouseDown={(event) => event.stopPropagation()}>
          <div className="bp-tabs" role="tablist" aria-label="بخش‌های گالری">
            <button type="button" role="tab" id="media-tab-library" aria-selected={tab === "library"} aria-controls="media-panel-library" className="bp-tab" onClick={() => setTab("library")}>
              <ImageIcon size={15} />کتابخانه رسانه
              <span className="bp-muted text-[11px]">({visibleItems.length.toLocaleString("fa-IR")})</span>
            </button>
            <button type="button" role="tab" id="media-tab-upload" aria-selected={tab === "upload"} aria-controls="media-panel-upload" className="bp-tab" onClick={() => setTab("upload")}>
              <Upload size={15} />بارگذاری چندرسانه‌ای
              {uploadQueue.length > 0 && <span className="bp-muted text-[11px]">({doneCount.toLocaleString("fa-IR")}/{uploadQueue.length.toLocaleString("fa-IR")})</span>}
            </button>
          </div>
        </div>

        {tab === "upload" ? (
          <div id="media-panel-upload" role="tabpanel" aria-labelledby="media-tab-upload" className="bp-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" onMouseDown={(event) => event.stopPropagation()}>
            <label className="grid cursor-pointer justify-items-center gap-2 border border-dashed border-[var(--bp-divider)] p-8 text-center hover:bg-[var(--bp-hover)]">
              <Upload size={26} className="text-[var(--bp-accent)]" />
              <strong className="text-[13px]">فایل‌ها را انتخاب کنید</strong>
              <span className="bp-muted text-[12px]">می‌توانید چند فایل را با هم انتخاب کنید؛ هر کدام جداگانه بارگذاری می‌شود و پیشرفتش را می‌بینید.</span>
              <input ref={uploadInputRef} type="file" multiple required accept={acceptedFiles} className="sr-only" disabled={uploading} onChange={(event) => void startUpload(event.target.files)} />
            </label>

            {uploadQueue.length > 0 && (
              <div className="mt-4 grid gap-2">
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="bp-muted">{doneCount.toLocaleString("fa-IR")} از {uploadQueue.length.toLocaleString("fa-IR")} فایل بارگذاری شد</span>
                  {!uploading && <BpButton size="sm" variant="ghost" onClick={() => setUploadQueue([])}>پاک کردن فهرست</BpButton>}
                </div>
                {uploadQueue.map((entry, index) => (
                  <div key={`${entry.name}-${index}`} className="grid gap-1.5 border border-[var(--bp-divider)] p-3">
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                      <span className={entry.status === "error" ? "text-[var(--bp-danger)]" : "bp-muted"}>
                        {entry.status === "done" ? "انجام شد" : entry.status === "error" ? entry.error : entry.status === "uploading" ? `${entry.percent.toLocaleString("fa-IR")}٪` : "در صف"}
                      </span>
                    </div>
                    <div className="bp-progress">
                      <div
                        className="bp-progress-fill"
                        data-state={entry.status === "done" ? "done" : entry.status === "error" ? "error" : undefined}
                        style={{ width: `${entry.status === "done" ? 100 : entry.status === "error" ? 100 : entry.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div id="media-panel-library" role="tabpanel" aria-labelledby="media-tab-library" className="bp-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-[340px]">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="جستجوی عنوان فایل" placeholder="جستجوی عنوان فایل..." className="bp-input bp-input-search" />
            </div>
            <BpButton isIconOnly aria-label="به‌روزرسانی گالری" isPending={loading} onClick={() => void load()}>{!loading && <RefreshCw size={15} />}</BpButton>
            {draft.length > 0 && <span className="bp-tag bp-tag-accent ms-auto">{draft.length.toLocaleString("fa-IR")} انتخاب</span>}
          </div>
          {error && <p className="mb-3 text-[12px] text-[var(--bp-danger)]">{error}</p>}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse bg-[var(--bp-surface)]" />)}</div>
          ) : visibleItems.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {visibleItems.map((item) => {
                const chosenIndex = draft.findIndex((chosen) => chosen.id === item.id);
                const chosen = chosenIndex >= 0;
                const usage = mediaUsageCount(item._count);
                return (
                  <div key={item.id} className={`flex min-w-0 flex-col border ${chosen ? "border-[var(--bp-accent)]" : "border-[var(--bp-divider)]"}`}>
                    <button type="button" onClick={() => toggle(item)} aria-pressed={chosen} aria-label={`انتخاب ${item.title}`} className="relative block w-full cursor-pointer border-0 bg-transparent p-0 text-start">
                      <span className="relative block aspect-square w-full overflow-hidden bg-[var(--bp-surface)]">
                        {item.type === "IMAGE"
                          ? <Image src={item.url} alt={item.title} fill unoptimized={item.mimeType === "image/gif"} sizes="(max-width:640px) 50vw, 16vw" className="object-cover" />
                          : item.type === "VIDEO"
                            ? <><video src={item.url} muted className="h-full w-full bg-black object-cover" /><span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center bg-[var(--bp-bg)] text-[var(--bp-text)]"><Film size={13} /></span></>
                            : <span className="grid h-full place-items-center text-[var(--bp-accent)]"><span className="grid justify-items-center gap-1 text-[11px]"><FileText size={32} />فایل PDF</span></span>}
                        {chosen && <span className="absolute right-1.5 top-1.5 grid h-6 min-w-6 place-items-center bg-[var(--bp-accent)] px-1.5 text-[11px] font-bold text-[var(--bp-bg)]">{multiple ? (chosenIndex + 1).toLocaleString("fa-IR") : <Check size={13} />}</span>}
                        {item.type === "IMAGE" && !item.alt && <span title="متن جایگزین ندارد" className="absolute left-1.5 bottom-1.5 grid h-5 w-5 place-items-center bg-[var(--bp-warning)] text-[var(--bp-bg)]"><TriangleAlert size={11} /></span>}
                      </span>
                      <span className="flex w-full items-center gap-2 px-2.5 py-2">
                        <span className="min-w-0 flex-1 truncate text-[12px]">{item.title}</span>
                        {usage > 0 && <small className="bp-muted shrink-0 text-[10px]">{usage.toLocaleString("fa-IR")} استفاده</small>}
                      </span>
                    </button>
                    <div className="grid grid-cols-2 border-t border-[var(--bp-divider)]">
                      <BpButton size="sm" variant="ghost" onClick={() => setDetailsId(item.id)} className="gap-1.5 text-[11px]">جزئیات</BpButton>
                      <BpButton size="sm" variant="ghost" disabled={deletingId === item.id || usage > 0} onClick={() => setPendingDelete(item)} className="gap-1.5 border-s border-[var(--bp-divider)] text-[11px] text-[var(--bp-danger)]">
                        <Trash2 size={12} />{usage > 0 ? "در استفاده" : deletingId === item.id ? "..." : "حذف"}
                      </BpButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center border border-dashed border-[var(--bp-divider)] p-8 text-center">
              <div>
                <ImageIcon className="mx-auto mb-2 text-[var(--bp-muted)]" size={34} />
                <strong className="block text-[13px]">{query ? "رسانه‌ای پیدا نشد" : "گالری این بخش خالی است"}</strong>
                <p className="bp-muted mt-1 text-[12px]">{query ? "عبارت جستجو را تغییر دهید." : "از بالای همین صفحه اولین فایل را بارگذاری کنید."}</p>
              </div>
            </div>
          )}
          </div>
          {detailsItem
            ? <MediaDetailsPanel key={detailsItem.id} media={{ ...detailsItem, usageCount: mediaUsageCount(detailsItem._count) }} onSaved={applySaved} className="bp-frame relative p-4 lg:sticky lg:top-0" />
            : <aside className="hidden place-items-center border border-dashed border-[var(--bp-divider)] p-6 text-center lg:grid">
                <div>
                  <strong className="block text-[13px]">ویرایش اطلاعات رسانه</strong>
                  <span className="bp-muted mt-1 block text-[12px]">روی «جزئیات» یک رسانه بزنید تا متن جایگزین و عنوانش را همین‌جا اصلاح کنید.</span>
                </div>
              </aside>}
          </div>
        </div>
        )}

        <footer className="flex flex-col-reverse gap-2 border-t border-[var(--bp-divider)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6" onMouseDown={(event) => event.stopPropagation()}>
          <span className="bp-muted hidden text-[12px] sm:block">{draft.length ? `${draft.length.toLocaleString("fa-IR")} رسانه برای ثبت انتخاب شده است.` : "هنوز رسانه‌ای انتخاب نشده است."}</span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <BpButton onClick={onClose}>انصراف</BpButton>
            <BpButton variant="primary" disabled={!draft.length} onClick={confirm} className="gap-2"><Check size={15} />تأیید انتخاب ({draft.length.toLocaleString("fa-IR")})</BpButton>
          </div>
        </footer>

        <BpDialog
          open={Boolean(pendingDelete)}
          title="حذف رسانه از گالری"
          description={`فایل «${pendingDelete?.title ?? ""}» از گالری و فضای FTP حذف می‌شود و امکان بازیابی آن وجود ندارد.`}
          onClose={() => { if (!deletingId) setPendingDelete(null); }}
          actions={<>
            <BpButton disabled={Boolean(deletingId)} onClick={() => setPendingDelete(null)}>انصراف</BpButton>
            <BpButton variant="danger" isPending={Boolean(deletingId)} onClick={() => { if (pendingDelete) void remove(pendingDelete); }}>حذف فایل</BpButton>
          </>}
        />
      </div>
    );
  }

  return (
    <>
    <Modal.Backdrop isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !pendingDelete) onClose(); }} variant="blur">
      <Modal.Container size="lg" placement="center" scroll="inside">
          <Modal.Dialog aria-label={`انتخاب از گالری ${scopeLabel}`} dir="rtl" className="mx-2 text-right max-h-[calc(100dvh-20px)] w-[calc(100%-16px)] max-w-6xl overflow-hidden bg-slate-50 sm:mx-5 sm:max-h-[calc(100dvh-40px)] sm:w-[calc(100%-40px)]">
            <Modal.Header className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--warning)]/10 text-[var(--warning)]"><ImageIcon size={21} /></span>
                <div className="min-w-0"><Modal.Heading className="truncate text-base font-bold text-slate-900 sm:text-lg">گالری {scopeLabel}</Modal.Heading><p className="mt-1 truncate text-xs text-slate-500">{multiple ? "چند رسانه انتخاب کنید؛ مورد اول تصویر اصلی خواهد بود." : allowedTypeKey.includes("DOCUMENT") ? "یک تصویر یا فایل PDF را به‌عنوان راهنمای سایز انتخاب کنید." : "یک تصویر را به‌عنوان تصویر شاخص انتخاب کنید."}</p></div>
              </div>
              <Modal.CloseTrigger aria-label="بستن گالری" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><X size={19} /></Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="min-h-[440px] p-0">
              <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 p-3 backdrop-blur sm:p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                  <form onSubmit={uploadFromForm} className="grid gap-3 rounded-2xl border border-dashed border-[#d8c59f] bg-[#fffcf6] p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                    <span className="hidden h-10 w-10 place-items-center rounded-xl bg-[var(--warning)]/15 text-[var(--warning)] sm:grid"><Upload size={19} /></span>
                    <label className="grid min-w-0 cursor-pointer gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-[#c8a867]">
                      <span className="text-xs font-bold text-slate-700">بارگذاری فایل جدید</span>
                      <span className="truncate text-[11px] text-slate-400">{uploadFileName || (allowedTypeKey.includes("DOCUMENT") ? "انتخاب تصویر یا فایل PDF راهنمای سایز" : scope === "CATEGORY" ? "انتخاب یک یا چند تصویر JPG، PNG یا WebP" : scope === "HOMEPAGE" ? "انتخاب تصویر JPG، PNG، WebP یا GIF برای صفحه اصلی" : "انتخاب یک یا چند تصویر یا ویدیوی محصول")}</span>
                      {/* Native input intentionally: visually hidden (sr-only) and triggered by this
                          styled label so the multi-file name/count row above can render as the
                          visible control; HeroUI's Input type="file" always renders its own native
                          picker chrome and cannot be hidden behind a custom trigger this way. */}
                      <input name="file" type="file" multiple required accept={acceptedFiles} className="sr-only" onChange={(event) => { const files = event.target.files; setUploadFileName(files?.length ? (files.length === 1 ? files[0].name : `${files.length.toLocaleString("fa-IR")} فایل انتخاب شد`) : ""); }} />
                    </label>
                    <Button type="submit" isPending={uploading} variant="primary" className="min-h-10 gap-2 bg-[var(--warning)] px-4 text-xs font-bold text-white">{({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Upload size={15} />}{isPending ? "در حال بارگذاری" : "بارگذاری"}</>}</Button>
                  </form>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="relative"><Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} fullWidth variant="secondary" placeholder="جستجوی عنوان فایل..." className="pr-10" /></div>
                    <Button type="button" variant="secondary" isIconOnly aria-label="به‌روزرسانی گالری" onPress={() => void load()} isPending={loading} className="hidden h-10 w-10 min-w-10 border border-slate-200 sm:inline-flex">{({ isPending }) => isPending ? <Spinner color="current" size="sm" /> : <RefreshCw size={16} />}</Button>
                  </div>
                </div>
                {error && <Alert status="danger" className="mt-3"><Alert.Description>{error}</Alert.Description></Alert>}
              </div>

              <div className="p-3 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-600">{loading ? "در حال دریافت رسانه‌ها..." : `${visibleItems.length.toLocaleString("fa-IR")} رسانه`}</span>{draft.length > 0 && <span className="rounded-full bg-[var(--warning)]/15 px-3 py-1 text-[11px] font-bold text-[var(--warning)]">{draft.length.toLocaleString("fa-IR")} انتخاب</span>}</div>
                {loading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-slate-200" />)}</div>
                ) : visibleItems.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visibleItems.map((item) => {
                      const chosenIndex = draft.findIndex((chosen) => chosen.id === item.id);
                      const usage = item._count.products + item._count.optionGuideProducts + item._count.categories + item._count.homepageHeroDesktop + item._count.homepageHeroMobile + item._count.homepagePromoDesktop + item._count.homepagePromoMobile + item._count.brandMainLogo + item._count.brandDarkLogo + item._count.brandFavicon + item._count.brandSocialImage;
                      const chosen = chosenIndex >= 0;
                      return (
                        <Card key={item.id} variant="secondary" className={`group relative min-w-0 overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition ${chosen ? "border-[var(--warning)] ring-2 ring-[var(--warning)]/15" : "border-transparent hover:border-slate-300 hover:shadow-md"}`}>
                          <Button type="button" variant="ghost" onPress={() => toggle(item)} aria-label={`انتخاب ${item.title}`} aria-pressed={chosen} className="relative flex h-auto w-full flex-col items-stretch justify-start overflow-hidden rounded-none p-0 text-right">
                            <div className="relative aspect-square w-full overflow-hidden bg-[#f1eee8]">{item.type === "IMAGE" ? <Image src={item.url} alt={item.title} fill unoptimized={item.mimeType === "image/gif"} sizes="(max-width:640px) 50vw, 20vw" className="object-cover transition duration-300 group-hover:scale-[1.025]" /> : item.type === "VIDEO" ? <><video src={item.url} muted className="h-full w-full bg-black object-cover" /><span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white"><Film size={14} /></span></> : <span className="grid h-full place-items-center text-[var(--warning)]"><span className="grid justify-items-center gap-2 text-xs font-bold"><FileText size={40} />فایل PDF</span></span>}</div>
                            <span className="flex w-full items-center gap-2 px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{item.title}</span>{usage > 0 && <small className="shrink-0 text-[10px] text-slate-400">{usage.toLocaleString("fa-IR")} استفاده</small>}</span>
                            {chosen && <span className="absolute right-2.5 top-2.5 grid h-8 min-w-8 place-items-center rounded-full bg-[var(--warning)] px-2 text-xs font-bold text-white shadow-lg">{multiple ? (chosenIndex + 1).toLocaleString("fa-IR") : <Check size={16} />}</span>}
                          </Button>
                          <Button type="button" size="sm" variant="danger-soft" fullWidth isDisabled={deletingId === item.id || usage > 0} onPress={() => setPendingDelete(item)} className="min-h-9 rounded-none border-t border-slate-100 text-[11px] font-bold"><Trash2 size={13} />{usage > 0 ? "در حال استفاده" : deletingId === item.id ? "در حال حذف..." : "حذف از گالری"}</Button>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center"><div><ImageIcon className="mx-auto mb-3 text-slate-300" size={38} /><strong className="block text-sm text-slate-600">{query ? "رسانه‌ای پیدا نشد" : "گالری این بخش خالی است"}</strong><p className="mt-1 text-xs text-slate-400">{query ? "عبارت جستجو را تغییر دهید." : "از بخش بالای صفحه اولین فایل را بارگذاری کنید."}</p></div></div>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="hidden text-xs text-slate-500 sm:block">{draft.length ? `${draft.length.toLocaleString("fa-IR")} رسانه برای ثبت انتخاب شده است.` : "هنوز رسانه‌ای انتخاب نشده است."}</span>
              <div className="grid grid-cols-2 gap-2 sm:flex"><Button type="button" variant="secondary" onPress={onClose} className="min-h-10 border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600">انصراف</Button><Button type="button" variant="primary" onPress={confirm} isDisabled={!draft.length} className="min-h-10 gap-2 bg-[#1c3155] px-5 font-bold text-white"><Check size={16} />تأیید انتخاب ({draft.length.toLocaleString("fa-IR")})</Button></div>
            </Modal.Footer>
          </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
    <DeleteConfirmDialog
      open={Boolean(pendingDelete)}
      itemName={pendingDelete?.title}
      description="این فایل از گالری و فضای FTP حذف می‌شود و امکان بازیابی آن وجود ندارد."
      loading={Boolean(deletingId)}
      onClose={() => { if (!deletingId) setPendingDelete(null); }}
      onConfirm={() => { if (pendingDelete) void remove(pendingDelete); }}
    />
    </>
  );
}
