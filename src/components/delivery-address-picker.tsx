"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Button, Modal, toast } from "@heroui/react";
import { ChevronLeft, MapPin, Plus, X } from "lucide-react";
import { AddressForm, type AddressFormStep, type StorefrontAddress } from "@/components/address-form";

export const ADDRESS_UPDATED_EVENT = "storefront:address-updated";

export function DeliveryAddressPicker({ initialAddresses, user, authenticated = true, compact = false, mode = "select" }: { initialAddresses: StorefrontAddress[]; user: { firstName: string | null; lastName: string | null; phone: string | null }; authenticated?: boolean; compact?: boolean; mode?: "select" | "create" }) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<StorefrontAddress | "new" | null>(null);
  const [addressFormStep, setAddressFormStep] = useState<AddressFormStep>(2);
  const [busy, setBusy] = useState<string | null>(null);
  const selected = addresses.find((item) => item.isDefault) ?? addresses[0];
  const compactTriggerStyle = compact ? selected ? {
    fontSize: "0.75rem",
    lineHeight: "1rem",
  } as CSSProperties : {
    "--button-bg": "#fff7ed",
    "--button-bg-hover": "#ffedd5",
    "--button-bg-pressed": "#fed7aa",
    "--button-fg": "#c65f1a",
    fontSize: "11px",
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

  const trigger = mode === "create"
    ? <Button type="button" variant="ghost" onPress={() => { setAddressFormStep(2); setEditing("new"); setOpen(true); }} className="h-auto min-h-10 gap-2 bg-transparent px-0 text-sm font-bold text-[var(--brand-primary)] hover:bg-transparent data-[hovered=true]:bg-transparent"><Plus size={21} />افزودن آدرس جدید</Button>
    : <Button type="button" variant="ghost" onPress={() => setOpen(true)} style={compactTriggerStyle} className={`h-auto gap-2 text-right font-normal ${compact ? selected ? "min-h-9 max-w-64 bg-transparent px-0 py-2 text-[var(--foreground)] hover:bg-transparent data-[hovered=true]:bg-transparent" : "min-h-9 max-w-64 rounded-lg px-3 py-2" : "min-h-0 bg-transparent p-0 text-[11px] hover:bg-transparent data-[hovered=true]:bg-transparent"}`}><MapPin size={compact && selected ? 20 : compact ? 16 : 18} className={`shrink-0 ${compact && selected ? "!h-5 !w-5" : ""} ${compact ? "text-current" : "text-[var(--brand-primary)]"}`} /><span className={`block max-w-52 truncate ${compact ? "text-current" : selected ? "text-[var(--foreground)]" : "text-amber-600/90"}`}>{selected ? `ارسال به (${selected.title})` : "انتخاب آدرس"}</span>{(!compact || !selected) && <ChevronLeft size={14} className={`shrink-0 ${compact ? "text-current" : "text-[var(--muted)]"}`} />}</Button>;

  if (!authenticated) return <a href="/login?next=/account" className={`flex items-center gap-2 font-normal ${compact ? "min-h-9 rounded-lg bg-orange-50 px-3 py-2 text-[11px] text-orange-700/85 transition hover:bg-orange-100" : "text-[10px] text-amber-600/90"}`}><MapPin size={17} className={compact ? "text-current" : "text-[var(--brand-primary)]"} />انتخاب آدرس<ChevronLeft size={14} className={compact ? "text-current" : "text-[var(--muted)]"} /></a>;

  return <>
    {trigger}
    <Modal.Backdrop isOpen={open} onOpenChange={(next) => { setOpen(next); if (!next) { setEditing(null); setAddressFormStep(2); } }} variant="blur">
      <Modal.Container placement="center" size="lg">
        <Modal.Dialog aria-label="انتخاب نشانی تحویل" dir="rtl" className="mx-3 max-h-[calc(100dvh-24px)] max-w-[560px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <Modal.Header className="flex-row items-center border-b border-[var(--border)] px-5 py-3">
            <Modal.Heading className="truncate text-base font-black text-[var(--foreground)]">
              {editing ? addressFormStep === 3 ? "تأیید اطلاعات آدرس" : editing === "new" ? "افزودن آدرس جدید" : "ویرایش آدرس" : "انتخاب آدرس تحویل"}
            </Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="mr-auto grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]">
              <X size={18} />
            </Modal.CloseTrigger>
          </Modal.Header>

          <Modal.Body className={`overflow-y-auto ${editing ? "p-0" : "bg-[var(--surface-secondary)]/70 p-4 sm:p-5"}`}>
            {editing ? (
              <AddressForm initial={editing === "new" ? null : editing} user={user} onSaved={replace} onCancel={() => { if (mode === "create") setOpen(false); else setEditing(null); }} onStepChange={setAddressFormStep} />
            ) : (
              <div className="grid gap-3">
                <h3 className="mb-1 mt-0 text-sm font-black text-[var(--foreground)]">آدرس‌ها</h3>
                {addresses.map((address) => (
                  <article key={address.id} className={`overflow-hidden rounded-[14px] border bg-[var(--surface)] transition ${address.isDefault ? "border-[var(--brand-primary)]" : "border-[var(--border)] hover:border-[var(--brand-primary)]/50"}`}>
                    <Button type="button" variant="ghost" fullWidth onPress={() => void select(address)} isPending={busy === address.id} className="h-auto min-h-0 justify-start bg-transparent px-4 py-3.5 text-right hover:bg-transparent data-[hovered=true]:bg-transparent">
                      <span className="block min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[var(--brand-primary)]"><MapPin size={19} className="shrink-0" /><strong className="truncate text-sm font-black">{address.title}</strong></span>
                        <span className="mt-2 block truncate text-xs leading-6 text-[var(--muted)]">{address.addressLine}، پلاک {address.plaque}{address.unit ? `، واحد ${address.unit}` : ""}</span>
                      </span>
                    </Button>
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
            <Modal.Footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
              <Button type="button" variant="primary" fullWidth onPress={() => { setAddressFormStep(2); setEditing("new"); }} className="min-h-10 justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)]">
                <Plus size={18} />افزودن آدرس جدید
              </Button>
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}
