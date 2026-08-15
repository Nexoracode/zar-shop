"use client";

import { useEffect, useState } from "react";
import { Button, Modal, toast } from "@heroui/react";
import { Check, ChevronLeft, MapPin, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { AddressForm, type StorefrontAddress } from "@/components/address-form";

export const ADDRESS_UPDATED_EVENT = "storefront:address-updated";

export function DeliveryAddressPicker({ initialAddresses, user, authenticated = true, compact = false, mode = "select" }: { initialAddresses: StorefrontAddress[]; user: { firstName: string | null; lastName: string | null; phone: string | null }; authenticated?: boolean; compact?: boolean; mode?: "select" | "create" }) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<StorefrontAddress | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const selected = addresses.find((item) => item.isDefault) ?? addresses[0];

  useEffect(() => {
    const synchronize = (event: Event) => {
      const detail = (event as CustomEvent<{ address?: StorefrontAddress; deletedId?: string; fallback?: StorefrontAddress }>).detail;
      setAddresses((current) => {
        if (detail.deletedId) return current.filter((item) => item.id !== detail.deletedId).map((item) => detail.fallback?.id === item.id ? { ...item, isDefault: true } : item);
        if (!detail.address) return current;
        return current.some((item) => item.id === detail.address!.id) ? current.map((item) => item.id === detail.address!.id ? detail.address! : detail.address!.isDefault ? { ...item, isDefault: false } : item) : [detail.address, ...current.map((item) => detail.address!.isDefault ? { ...item, isDefault: false } : item)];
      });
    };
    window.addEventListener(ADDRESS_UPDATED_EVENT, synchronize);
    return () => window.removeEventListener(ADDRESS_UPDATED_EVENT, synchronize);
  }, []);

  function replace(address: StorefrontAddress) {
    setAddresses((current) => {
      const next = current.some((item) => item.id === address.id) ? current.map((item) => item.id === address.id ? address : address.isDefault ? { ...item, isDefault: false } : item) : [address, ...current.map((item) => address.isDefault ? { ...item, isDefault: false } : item)];
      window.dispatchEvent(new CustomEvent(ADDRESS_UPDATED_EVENT, { detail: { address } }));
      return next;
    });
    setEditing(null);
    if (mode === "create") setOpen(false);
  }

  async function select(address: StorefrontAddress) {
    if (address.isDefault) { setOpen(false); return; }
    setBusy(address.id);
    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-default" }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "انتخاب نشانی انجام نشد.");
      replace(result.item as StorefrontAddress); setOpen(false); toast.success("نشانی تحویل تغییر کرد");
    } catch (reason) { toast.danger("نشانی انتخاب نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); }
    finally { setBusy(null); }
  }

  async function remove(address: StorefrontAddress) {
    setBusy(address.id);
    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف نشانی انجام نشد.");
      const next = addresses.filter((item) => item.id !== address.id);
      if (address.isDefault && next[0]) next[0] = { ...next[0], isDefault: true };
      setAddresses(next); window.dispatchEvent(new CustomEvent(ADDRESS_UPDATED_EVENT, { detail: { deletedId: address.id, fallback: next[0] } })); toast.success("نشانی حذف شد");
    } catch (reason) { toast.danger("نشانی حذف نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); }
    finally { setBusy(null); }
  }

  const trigger = mode === "create"
    ? <Button type="button" variant="ghost" onPress={() => { setEditing("new"); setOpen(true); }} className="h-auto min-h-10 gap-2 bg-transparent px-0 text-sm font-bold text-[var(--brand-primary)] hover:bg-transparent data-[hovered=true]:bg-transparent"><Plus size={21} />افزودن آدرس جدید</Button>
    : <Button type="button" variant="ghost" onPress={() => setOpen(true)} className={`h-auto min-h-0 gap-2 bg-transparent p-0 text-right hover:bg-transparent data-[hovered=true]:bg-transparent ${compact ? "max-w-64 text-[11px]" : "text-xs"}`}><MapPin size={compact ? 16 : 18} className="shrink-0 text-[var(--brand-primary)]" /><strong className={`block max-w-52 truncate ${selected ? "text-[var(--foreground)]" : "text-amber-600/90"}`}>{selected ? `ارسال به (${selected.title})` : "انتخاب آدرس"}</strong><ChevronLeft size={14} className="shrink-0 text-[var(--muted)]" /></Button>;

  if (!authenticated) return <a href="/login?next=/account" className="flex items-center gap-2 text-[11px] font-bold text-amber-600/90"><MapPin size={17} className="text-[var(--brand-primary)]" />انتخاب آدرس<ChevronLeft size={14} className="text-[var(--muted)]" /></a>;

  return <>{trigger}<Modal.Backdrop isOpen={open} onOpenChange={(next) => { setOpen(next); if (!next) setEditing(null); }} variant="blur"><Modal.Container placement="center" size="lg"><Modal.Dialog aria-label="انتخاب نشانی تحویل" dir="rtl" className="mx-3 max-h-[calc(100dvh-16px)] max-w-[550px] overflow-hidden rounded-[18px] bg-[var(--surface)]"><Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] px-5 py-4"><Modal.Heading className="text-base font-black">{editing ? editing === "new" ? "افزودن آدرس جدید" : "ویرایش آدرس" : "انتخاب نشانی تحویل"}</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-slate-600"><X size={21} /></Modal.CloseTrigger></Modal.Header><Modal.Body className={`overflow-y-auto ${editing ? "p-0" : "p-5"}`}>{editing ? <AddressForm initial={editing === "new" ? null : editing} user={user} onSaved={replace} onCancel={() => setEditing(null)} /> : <div className="grid gap-3">{addresses.map((address) => <article key={address.id} className={`rounded-xl border p-4 transition ${address.isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-[var(--border)]"}`}><div className="flex items-start gap-3"><Button type="button" variant="ghost" onPress={() => void select(address)} isPending={busy === address.id} className="h-auto min-w-0 flex-1 justify-start gap-3 bg-transparent p-0 text-right hover:bg-transparent data-[hovered=true]:bg-transparent"><span className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border ${address.isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-[var(--border)]"}`}>{address.isDefault && <Check size={13} />}</span><span className="min-w-0"><strong className="block text-sm">{address.title}</strong><span className="mt-2 block text-xs leading-6 text-[var(--muted)]">{address.province}، {address.city}، {address.addressLine}، پلاک {address.plaque}</span><span className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]"><UserRound size={14} />{address.recipient}{address.recipientType === "OTHER" && <b className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">گیرنده دیگر</b>}</span></span></Button><div className="flex shrink-0 gap-1"><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${address.title}`} onPress={() => setEditing(address)}><Pencil size={15} /></Button><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف ${address.title}`} isDisabled={busy === address.id} onPress={() => void remove(address)}><Trash2 size={15} /></Button></div></div></article>)}{!addresses.length && <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-[var(--border)] text-center"><div><MapPin className="mx-auto text-[var(--muted)]" size={34} /><strong className="mt-3 block text-sm">هنوز نشانی ثبت نکرده‌اید</strong><p className="mb-0 mt-1 text-xs text-[var(--muted)]">اولین نشانی به‌صورت پیش‌فرض انتخاب می‌شود.</p></div></div>}<Button type="button" variant="secondary" onPress={() => setEditing("new")} className="min-h-12 justify-start gap-2 rounded-xl border border-[var(--brand-primary)] px-4 font-bold text-[var(--brand-primary)]"><Plus size={18} />افزودن نشانی جدید</Button></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop></>;
}
