"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Popover } from "@heroui/react";
import { EllipsisVertical, MapPin, Pencil, Trash2, X } from "lucide-react";
import { AddressForm, type AddressFormStep, type StorefrontAddress } from "@/components/address-form";
import { ADDRESS_UPDATED_EVENT, DeliveryAddressPicker } from "@/components/delivery-address-picker";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

type AccountAddressBookProps = {
  initialAddresses: StorefrontAddress[];
  user: { firstName: string | null; lastName: string | null; phone: string | null };
};

export function AccountAddressBook({ initialAddresses, user }: AccountAddressBookProps) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [menuAddressId, setMenuAddressId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StorefrontAddress | null>(null);
  const [editStep, setEditStep] = useState<AddressFormStep>(2);
  const [pendingDelete, setPendingDelete] = useState<StorefrontAddress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ address?: StorefrontAddress; deletedId?: string; fallback?: StorefrontAddress }>).detail;
      setAddresses((current) => {
        if (detail.deletedId) return current.filter((item) => item.id !== detail.deletedId).map((item, index) => detail.fallback?.id === item.id || (!detail.fallback && index === 0) ? { ...item, isDefault: true } : item);
        if (!detail.address) return current;
        return current.some((item) => item.id === detail.address!.id) ? current.map((item) => item.id === detail.address!.id ? detail.address! : detail.address!.isDefault ? { ...item, isDefault: false } : item) : [detail.address, ...current.map((item) => detail.address!.isDefault ? { ...item, isDefault: false } : item)];
      });
    };
    window.addEventListener(ADDRESS_UPDATED_EVENT, update);
    return () => window.removeEventListener(ADDRESS_UPDATED_EVENT, update);
  }, []);

  function startEditing(address: StorefrontAddress) {
    setMenuAddressId(null);
    setEditStep(2);
    setEditing(address);
  }

  function finishEditing(address: StorefrontAddress) {
    window.dispatchEvent(new CustomEvent(ADDRESS_UPDATED_EVENT, { detail: { address } }));
    setEditing(null);
    setEditStep(2);
  }

  function requestDelete(address: StorefrontAddress) {
    setMenuAddressId(null);
    setDeleteError("");
    setPendingDelete(address);
  }

  async function removeAddress() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/account/addresses/${pendingDelete.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف آدرس انجام نشد.");
      const remaining = addresses.filter((item) => item.id !== pendingDelete.id);
      const fallback = pendingDelete.isDefault && remaining[0] ? { ...remaining[0], isDefault: true } : undefined;
      window.dispatchEvent(new CustomEvent(ADDRESS_UPDATED_EVENT, { detail: { deletedId: pendingDelete.id, fallback } }));
      setPendingDelete(null);
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : "حذف آدرس انجام نشد.");
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <section id="addresses" className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <h2 className="relative m-0 w-fit pb-3 text-base font-bold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--brand-primary)]">آدرس‌ها</h2>
        <DeliveryAddressPicker mode="create" initialAddresses={addresses} user={user} />
      </header>
      <div className="px-4 pb-5 sm:px-6">
        <h3 className="mb-4 mt-1 text-sm font-bold">آدرس‌های من</h3>
        <div className="grid gap-3">
          {addresses.map((address) => <article key={address.id} className={`relative rounded-[10px] border py-4 pr-5 pl-14 ${address.isDefault ? "border-[var(--brand-primary)]" : "border-[var(--border)]"}`}>
            <Popover isOpen={menuAddressId === address.id} onOpenChange={(open) => setMenuAddressId(open ? address.id : null)}>
              <Popover.Trigger aria-label={`عملیات آدرس ${address.title}`} className="absolute left-3 top-3 grid size-9 cursor-pointer place-items-center rounded-lg bg-transparent text-[var(--muted)] outline-none transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30">
                <EllipsisVertical className="!h-5 !w-5" />
              </Popover.Trigger>
              <Popover.Content placement="bottom left" dir="rtl" className="z-[190] w-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-right text-[var(--foreground)] shadow-xl">
                <Popover.Dialog dir="rtl" className="grid p-2 text-right">
                  <Button type="button" variant="ghost" fullWidth onPress={() => startEditing(address)} className="min-h-11 justify-start gap-3 rounded-lg px-3 text-sm font-normal"><Pencil className="!h-5 !w-5 text-[var(--muted)]" />ویرایش</Button>
                  <Button type="button" variant="ghost" fullWidth onPress={() => requestDelete(address)} className="min-h-11 justify-start gap-3 rounded-lg px-3 text-sm font-normal text-[var(--danger)]"><Trash2 className="!h-5 !w-5" />حذف</Button>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
            <div className="flex items-center gap-2"><MapPin size={19} className="shrink-0 text-[var(--brand-primary)]" /><strong className="text-sm">{address.title}</strong>{address.isDefault && <span className="text-[10px] font-bold text-[var(--brand-primary)]">پیش‌فرض</span>}</div>
            <p className="mb-0 mt-3 text-xs leading-7 text-slate-600">{address.province}، {address.city}، {address.addressLine}، پلاک {address.plaque}{address.unit ? `، واحد ${address.unit}` : ""}</p>
            <p className="mb-0 mt-1 text-xs leading-7 text-slate-500">کد پستی: <b dir="ltr" className="font-medium">{address.postalCode}</b></p>
            <p className="mb-0 mt-1 text-xs leading-7 text-slate-500">تحویل‌گیرنده: <b className="font-medium text-slate-700">{address.recipient}</b><span className="mx-2 text-slate-300">|</span><b dir="ltr" className="font-medium text-slate-700">{address.phone}</b></p>
          </article>)}
          {!addresses.length && <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-[var(--border)] text-center"><div><MapPin size={34} className="mx-auto text-[var(--muted)]" /><strong className="mt-3 block text-sm">هنوز آدرسی ثبت نشده است</strong><p className="mb-0 mt-1 text-xs text-[var(--muted)]">از دکمه افزودن آدرس جدید، اولین آدرس خود را ثبت کنید.</p></div></div>}
        </div>
      </div>
    </section>

    <Modal.Backdrop isOpen={Boolean(editing)} onOpenChange={(open) => { if (!open) { setEditing(null); setEditStep(2); } }} variant="blur">
      <Modal.Container placement="center" size="lg">
        <Modal.Dialog aria-label="ویرایش آدرس" dir="rtl" className="mx-3 max-h-[calc(100dvh-24px)] max-w-[560px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <Modal.Header className="flex-row items-center border-b border-[var(--border)] px-5 py-3">
            <Modal.Heading className="truncate text-base font-bold text-[var(--foreground)]">{editStep === 3 ? "تأیید اطلاعات آدرس" : "ویرایش آدرس"}</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="mr-auto grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"><X size={18} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="overflow-y-auto p-0">{editing && <AddressForm initial={editing} user={user} onSaved={finishEditing} onCancel={() => setEditing(null)} onStepChange={setEditStep} />}</Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>

    <DeleteConfirmDialog
      open={Boolean(pendingDelete)}
      title="حذف آدرس"
      itemName={pendingDelete?.title}
      description="آیا از حذف این آدرس مطمئن هستید؟ پس از حذف، امکان بازگردانی آن وجود ندارد."
      error={deleteError}
      loading={deleting}
      onClose={() => { if (!deleting) { setPendingDelete(null); setDeleteError(""); } }}
      onConfirm={() => void removeAddress()}
    />
  </>;
}
