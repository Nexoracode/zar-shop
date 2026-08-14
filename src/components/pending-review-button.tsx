"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Modal, TextArea, toast } from "@heroui/react";
import { Star, X } from "lucide-react";

export function PendingReviewButton({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false); const [rating, setRating] = useState(5); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/products/${productId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, title: form.get("title"), body: form.get("body") }) });
    const result = await response.json().catch(() => null); setBusy(false);
    if (!response.ok) { setError(result?.message ?? "ثبت دیدگاه انجام نشد."); return; }
    setOpen(false); toast.success("دیدگاه شما ثبت شد", { description: "پس از بررسی مدیریت نمایش داده می‌شود." }); router.refresh();
  }
  return <><Button type="button" variant="primary" fullWidth onPress={() => setOpen(true)} className="gap-2"><Star size={17} />ثبت امتیاز و دیدگاه</Button><Modal.Backdrop isOpen={open} onOpenChange={setOpen} variant="blur"><Modal.Container placement="center" size="lg"><Modal.Dialog aria-label={`ثبت دیدگاه برای ${productName}`} dir="rtl" className="mx-3 bg-[var(--surface)]"><Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5"><Modal.Heading className="text-base font-black">دیدگاه درباره {productName}</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="p-5"><form onSubmit={submit} className="grid gap-4"><div><span className="mb-2 block text-xs font-bold">امتیاز شما</span><div className="flex gap-1" dir="ltr">{[1,2,3,4,5].map((value) => <Button key={value} type="button" isIconOnly variant="ghost" aria-label={`${value} ستاره`} onPress={() => setRating(value)} className="text-amber-400"><Star size={26} className={value <= rating ? "fill-current" : ""} /></Button>)}</div></div><label className="grid gap-2 text-xs font-bold">عنوان دیدگاه<Input name="title" required minLength={3} maxLength={120} variant="secondary" /></label><label className="grid gap-2 text-xs font-bold">متن دیدگاه<TextArea name="body" required minLength={10} maxLength={3000} rows={5} variant="secondary" /></label>{error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}<Button type="submit" variant="primary" isPending={busy}>ثبت دیدگاه</Button></form></Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop></>;
}
