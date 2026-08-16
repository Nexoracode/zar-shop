"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Button, Modal, toast } from "@heroui/react";
import { Check, ChevronLeft, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { AddressForm, type StorefrontAddress } from "@/components/address-form";

export const ADDRESS_UPDATED_EVENT = "storefront:address-updated";

export function DeliveryAddressPicker({ initialAddresses, user, authenticated = true, compact = false, mode = "select" }: { initialAddresses: StorefrontAddress[]; user: { firstName: string | null; lastName: string | null; phone: string | null }; authenticated?: boolean; compact?: boolean; mode?: "select" | "create" }) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<StorefrontAddress | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const selected = addresses.find((item) => item.isDefault) ?? addresses[0];
  const compactTriggerStyle = compact ? {
    "--button-bg": "#fff7ed",
    "--button-bg-hover": "#ffedd5",
    "--button-bg-pressed": "#fed7aa",
    "--button-fg": "#c65f1a",
  } as CSSProperties : undefined;

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
    : <Button type="button" variant="ghost" onPress={() => setOpen(true)} style={compactTriggerStyle} className={`h-auto gap-2 text-right font-normal ${compact ? "min-h-9 max-w-64 rounded-lg px-3 py-2 text-[11px]" : "min-h-0 bg-transparent p-0 text-[11px] hover:bg-transparent data-[hovered=true]:bg-transparent"}`}><MapPin size={compact ? 16 : 18} className={`shrink-0 ${compact ? "text-current" : "text-[var(--brand-primary)]"}`} /><span className={`block max-w-52 truncate ${compact ? "text-current" : selected ? "text-[var(--foreground)]" : "text-amber-600/90"}`}>{selected ? `ارسال به (${selected.title})` : "انتخاب آدرس"}</span><ChevronLeft size={14} className={`shrink-0 ${compact ? "text-current" : "text-[var(--muted)]"}`} /></Button>;

  if (!authenticated) return <a href="/login?next=/account" className={`flex items-center gap-2 font-normal ${compact ? "min-h-9 rounded-lg bg-orange-50 px-3 py-2 text-[11px] text-orange-700/85 transition hover:bg-orange-100" : "text-[10px] text-amber-600/90"}`}><MapPin size={17} className={compact ? "text-current" : "text-[var(--brand-primary)]"} />انتخاب آدرس<ChevronLeft size={14} className={compact ? "text-current" : "text-[var(--muted)]"} /></a>;

  return <>
    {trigger}
    <Modal.Backdrop isOpen={open} onOpenChange={(next) => { setOpen(next); if (!next) setEditing(null); }} variant="blur">
      <Modal.Container placement="center" size="lg">
        <Modal.Dialog aria-label="انتخاب نشانی تحویل" dir="rtl" className="mx-3 max-h-[calc(100dvh-24px)] max-w-[560px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <Modal.Header className="flex-row items-center gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6 sm:py-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
              <MapPin size={21} />
            </span>
            <div className="min-w-0">
              <Modal.Heading className="truncate text-base font-black text-[var(--foreground)] sm:text-lg">
                {editing ? editing === "new" ? "افزودن آدرس جدید" : "ویرایش آدرس" : "انتخاب آدرس تحویل"}
              </Modal.Heading>
              <p className="mb-0 mt-0.5 text-[11px] leading-5 text-[var(--muted)] sm:text-xs">
                {editing ? "اطلاعات نشانی را کامل کنید." : "آدرسی را که سفارش به آن ارسال می‌شود انتخاب کنید."}
              </p>
            </div>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]">
              <X size={19} />
            </Modal.CloseTrigger>
          </Modal.Header>

          <Modal.Body className={`overflow-y-auto ${editing ? "p-0" : "bg-[var(--surface-secondary)]/70 p-4 sm:p-5"}`}>
            {editing ? (
              <AddressForm initial={editing === "new" ? null : editing} user={user} onSaved={replace} onCancel={() => setEditing(null)} />
            ) : (
              <div className="grid gap-3">
                {addresses.map((address) => (
                  <article key={address.id} className={`rounded-2xl border bg-[var(--surface)] p-4 shadow-sm transition sm:p-5 ${address.isDefault ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/10" : "border-[var(--border)] hover:border-[var(--brand-primary)]/35"}`}>
                    <div className="flex items-start gap-3">
                      <Button type="button" variant="ghost" onPress={() => void select(address)} isPending={busy === address.id} className="h-auto min-w-0 flex-1 justify-start gap-3 bg-transparent p-0 text-right hover:bg-transparent data-[hovered=true]:bg-transparent">
                        <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 ${address.isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                          {address.isDefault && <Check size={14} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm font-black text-[var(--foreground)]">{address.title}</strong>
                            {address.isDefault && <span className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary)]">انتخاب‌شده</span>}
                          </span>
                          <span className="mt-2 block text-xs leading-7 text-[var(--muted)]">{address.province}، {address.city}، {address.addressLine}، پلاک {address.plaque}{address.unit ? `، واحد ${address.unit}` : ""}</span>
                        </span>
                      </Button>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${address.title}`} onPress={() => setEditing(address)} className="rounded-lg text-[var(--muted)] hover:text-[var(--brand-primary)]"><Pencil size={15} /></Button>
                        <Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف ${address.title}`} isDisabled={busy === address.id} onPress={() => void remove(address)} className="rounded-lg"><Trash2 size={15} /></Button>
                      </div>
                    </div>
                  </article>
                ))}
                {!addresses.length && (
                  <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 text-center shadow-sm">
                    <div>
                      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]"><MapPin size={26} /></span>
                      <strong className="mt-4 block text-sm font-black text-[var(--foreground)]">هنوز آدرسی ثبت نکرده‌اید</strong>
                      <p className="mb-0 mt-1 text-xs leading-6 text-[var(--muted)]">آدرس جدید پس از ثبت به‌صورت خودکار انتخاب می‌شود.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>

          {!editing && (
            <Modal.Footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-5">
              <Button type="button" variant="primary" fullWidth onPress={() => setEditing("new")} className="min-h-12 justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 font-bold text-[var(--brand-primary-foreground)]">
                <Plus size={18} />افزودن آدرس جدید
              </Button>
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}
