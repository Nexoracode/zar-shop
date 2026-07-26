"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, Button, Card, Input, Modal } from "@heroui/react";
import { Check, Film, ImageIcon, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import type { MediaChoice, MediaScope } from "@/components/media-library";

type PickerItem = MediaChoice & { _count: { products: number; categories: number } };
type Props = { open: boolean; scope: MediaScope; multiple?: boolean; selected: MediaChoice[]; onClose: () => void; onConfirm: (items: MediaChoice[]) => void };

export function MediaPickerDialog({ open, scope, multiple = false, selected, onClose, onConfirm }: Props) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [draft, setDraft] = useState<MediaChoice[]>(selected);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");

  const scopeLabel = scope === "CATEGORY" ? "دسته‌بندی" : "محصول";
  const acceptedFiles = scope === "CATEGORY" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/webm";

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/media?scope=${scope}&limit=200`, { cache: "no-store", signal });
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
        setUploadFileName("");
        void load(controller.signal);
      }
    });
    return () => controller.abort();
  }, [open, selected, load]);

  function toggle(item: MediaChoice) {
    if (!multiple) {
      setDraft((current) => current[0]?.id === item.id ? [] : [item]);
      return;
    }
    setDraft((current) => current.some((chosen) => chosen.id === item.id) ? current.filter((chosen) => chosen.id !== item.id) : [...current, item]);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
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
      setUploadFileName("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "بارگذاری فایل ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: PickerItem) {
    const usage = item._count.products + item._count.categories;
    if (usage) {
      setError("این رسانه در حال استفاده است؛ ابتدا آن را از محصول یا دسته‌بندی مربوط جدا کنید.");
      return;
    }
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

  function confirm() {
    onConfirm(draft);
    onClose();
  }

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} variant="blur">
      <Modal.Container size="lg" placement="center" scroll="inside">
          <Modal.Dialog aria-label={`انتخاب از گالری ${scopeLabel}`} className="mx-2 max-h-[calc(100dvh-20px)] w-[calc(100%-16px)] max-w-6xl overflow-hidden bg-slate-50 sm:mx-5 sm:max-h-[calc(100dvh-40px)] sm:w-[calc(100%-40px)]">
            <Modal.Header className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fbf7ef] text-[#9a7434]"><ImageIcon size={21} /></span>
                <div className="min-w-0"><Modal.Heading className="truncate text-base font-black text-slate-900 sm:text-lg">گالری {scopeLabel}</Modal.Heading><p className="mt-1 truncate text-xs text-slate-500">{multiple ? "چند رسانه انتخاب کنید؛ مورد اول تصویر اصلی خواهد بود." : "یک تصویر را به‌عنوان تصویر شاخص انتخاب کنید."}</p></div>
              </div>
              <Modal.CloseTrigger aria-label="بستن گالری" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><X size={19} /></Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="min-h-[440px] p-0">
              <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 p-3 backdrop-blur sm:p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                  <form onSubmit={upload} className="grid gap-3 rounded-2xl border border-dashed border-[#d8c59f] bg-[#fffcf6] p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                    <span className="hidden h-10 w-10 place-items-center rounded-xl bg-[#f4ead8] text-[#8b682b] sm:grid"><Upload size={19} /></span>
                    <label className="grid min-w-0 cursor-pointer gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-[#c8a867]">
                      <span className="text-xs font-bold text-slate-700">بارگذاری فایل جدید</span>
                      <span className="truncate text-[11px] text-slate-400">{uploadFileName || (scope === "CATEGORY" ? "انتخاب تصویر JPG، PNG یا WebP" : "انتخاب تصویر یا ویدیوی محصول")}</span>
                      <input name="file" type="file" required accept={acceptedFiles} className="sr-only" onChange={(event) => setUploadFileName(event.target.files?.[0]?.name ?? "")} />
                    </label>
                    <Button type="submit" isDisabled={uploading} variant="primary" className="min-h-10 gap-2 bg-[#b5904c] px-4 text-xs font-bold text-white"><Upload size={15} />{uploading ? "در حال بارگذاری" : "بارگذاری"}</Button>
                  </form>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="relative"><Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} fullWidth variant="secondary" placeholder="جست‌وجوی عنوان فایل..." className="pr-10" /></div>
                    <Button type="button" variant="secondary" isIconOnly aria-label="به‌روزرسانی گالری" onPress={() => void load()} isDisabled={loading} className="hidden h-10 w-10 min-w-10 border border-slate-200 sm:inline-flex"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></Button>
                  </div>
                </div>
                {error && <Alert status="danger" className="mt-3"><Alert.Description>{error}</Alert.Description></Alert>}
              </div>

              <div className="p-3 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-600">{loading ? "در حال دریافت رسانه‌ها..." : `${visibleItems.length.toLocaleString("fa-IR")} رسانه`}</span>{draft.length > 0 && <span className="rounded-full bg-[#f4ead8] px-3 py-1 text-[11px] font-bold text-[#785b27]">{draft.length.toLocaleString("fa-IR")} انتخاب</span>}</div>
                {loading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-slate-200" />)}</div>
                ) : visibleItems.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visibleItems.map((item) => {
                      const chosenIndex = draft.findIndex((chosen) => chosen.id === item.id);
                      const usage = item._count.products + item._count.categories;
                      const chosen = chosenIndex >= 0;
                      return (
                        <Card key={item.id} variant="secondary" className={`group relative min-w-0 overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition ${chosen ? "border-[#b5904c] ring-2 ring-[#b5904c]/15" : "border-transparent hover:border-slate-300 hover:shadow-md"}`}>
                          <Button type="button" variant="ghost" onPress={() => toggle(item)} aria-label={`انتخاب ${item.title}`} aria-pressed={chosen} className="relative flex h-auto w-full flex-col items-stretch justify-start overflow-hidden rounded-none p-0 text-right">
                            <div className="relative aspect-square w-full overflow-hidden bg-[#f1eee8]">{item.type === "IMAGE" ? <Image src={item.url} alt={item.title} fill sizes="(max-width:640px) 50vw, 20vw" className="object-cover transition duration-300 group-hover:scale-[1.025]" /> : <><video src={item.url} muted className="h-full w-full bg-black object-cover" /><span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white"><Film size={14} /></span></>}</div>
                            <span className="flex w-full items-center gap-2 px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{item.title}</span>{usage > 0 && <small className="shrink-0 text-[10px] text-slate-400">{usage.toLocaleString("fa-IR")} استفاده</small>}</span>
                            {chosen && <span className="absolute right-2.5 top-2.5 grid h-8 min-w-8 place-items-center rounded-full bg-[#b5904c] px-2 text-xs font-black text-white shadow-lg">{multiple ? (chosenIndex + 1).toLocaleString("fa-IR") : <Check size={16} />}</span>}
                          </Button>
                          <Button type="button" size="sm" variant="danger-soft" fullWidth isDisabled={deletingId === item.id || usage > 0} onPress={() => void remove(item)} className="min-h-9 rounded-none border-t border-slate-100 text-[11px] font-bold"><Trash2 size={13} />{usage > 0 ? "در حال استفاده" : deletingId === item.id ? "در حال حذف..." : "حذف از گالری"}</Button>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center"><div><ImageIcon className="mx-auto mb-3 text-slate-300" size={38} /><strong className="block text-sm text-slate-600">{query ? "رسانه‌ای پیدا نشد" : "گالری این بخش خالی است"}</strong><p className="mt-1 text-xs text-slate-400">{query ? "عبارت جست‌وجو را تغییر دهید." : "از بخش بالای صفحه اولین فایل را بارگذاری کنید."}</p></div></div>
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
  );
}
