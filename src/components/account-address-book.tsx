"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
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

  return <section id="addresses" className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"><header className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><h2 className="relative m-0 w-fit pb-3 text-base font-black after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--brand-primary)]">آدرس‌ها</h2><DeliveryAddressPicker mode="create" initialAddresses={addresses} user={user} /></header><div className="px-4 pb-5 sm:px-6"><h3 className="mb-4 mt-1 text-sm font-black">آدرس‌های من</h3><div className="grid gap-3">{addresses.map((address) => <article key={address.id} className={`rounded-[10px] border px-5 py-4 ${address.isDefault ? "border-[var(--brand-primary)]" : "border-[var(--border)]"}`}><div className="flex items-center gap-2"><MapPin size={19} className="shrink-0 text-[var(--brand-primary)]" /><strong className="text-sm">{address.title}</strong>{address.isDefault && <span className="text-[10px] font-bold text-[var(--brand-primary)]">پیش‌فرض</span>}</div><p className="mb-0 mt-3 text-xs leading-7 text-slate-600">{address.province}، {address.city}، {address.addressLine}، پلاک {address.plaque}{address.unit ? `، واحد ${address.unit}` : ""}</p><p className="mb-0 mt-1 text-xs leading-7 text-slate-500">کد پستی: <b dir="ltr" className="font-medium">{address.postalCode}</b></p><p className="mb-0 mt-1 text-xs leading-7 text-slate-500">تحویل‌گیرنده: <b className="font-medium text-slate-700">{address.recipient}</b><span className="mx-2 text-slate-300">|</span><b dir="ltr" className="font-medium text-slate-700">{address.phone}</b></p></article>)}{!addresses.length && <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-[var(--border)] text-center"><div><MapPin size={34} className="mx-auto text-[var(--muted)]" /><strong className="mt-3 block text-sm">هنوز آدرسی ثبت نشده است</strong><p className="mb-0 mt-1 text-xs text-[var(--muted)]">از دکمه افزودن آدرس جدید، اولین آدرس خود را ثبت کنید.</p></div></div>}</div></div></section>;
}
