"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, UserRound } from "lucide-react";
import { ADDRESS_UPDATED_EVENT, DeliveryAddressPicker } from "@/components/delivery-address-picker";
import type { StorefrontAddress } from "@/components/address-form";

export function AccountAddressBook({ initialAddresses, user }: { initialAddresses: StorefrontAddress[]; user: { firstName: string | null; lastName: string | null; phone: string | null } }) {
  const [addresses, setAddresses] = useState(initialAddresses);
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

  return <section id="addresses" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-5"><div><h2 className="m-0 text-base font-black">نشانی‌های من</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">مدیریت نشانی تحویل برای خودتان یا دیگران</p></div><DeliveryAddressPicker initialAddresses={addresses} user={user} /></header><div className="grid gap-4 p-5 md:grid-cols-2">{addresses.map((address) => <article key={address.id} className={`rounded-2xl border p-4 ${address.isDefault ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-[var(--border)]"}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><MapPin size={19} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{address.title}</strong>{address.isDefault && <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary-foreground)]">پیش‌فرض</span>}{address.recipientType === "OTHER" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">ارسال به دیگری</span>}</div><p className="mb-0 mt-3 text-xs leading-6 text-[var(--muted)]">{address.province}، {address.city}، {address.addressLine}، پلاک {address.plaque}{address.unit ? `، واحد ${address.unit}` : ""}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--muted)]"><span className="flex items-center gap-1.5"><UserRound size={14} />{address.recipient}</span><span className="flex items-center gap-1.5" dir="ltr"><Phone size={14} />{address.phone}</span><span>کد پستی: <b dir="ltr">{address.postalCode}</b></span></div></div></div></div></article>)}{!addresses.length && <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[var(--border)] text-center md:col-span-2"><div><MapPin size={34} className="mx-auto text-[var(--muted)]" /><strong className="mt-3 block text-sm">هنوز نشانی ثبت نشده است</strong><p className="mb-0 mt-1 text-xs text-[var(--muted)]">از دکمه انتخاب نشانی، اولین نشانی خود را اضافه کنید.</p></div></div>}</div></section>;
}
