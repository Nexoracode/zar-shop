"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { Check, Truck } from "lucide-react";
import { formatMoney } from "@/lib/format";

export type ShippingOption = {
  methodId: string;
  title: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  source: "TAPIN" | "TABLE";
};

/**
 * The delivery options for the chosen address, priced by the server.
 *
 * Prices are never worked out here — the browser asks and displays. The checkout recomputes the
 * one that gets picked, so what is shown is a quote, not the figure that lands on the order.
 */
export function ShippingMethodPicker({ addressId, currency, selectedMethodId, onSelect }: {
  addressId: string | null;
  /** The store's unit, so a price here reads the same as the one in the order summary. */
  currency: "IRR" | "IRT";
  selectedMethodId: string | null;
  onSelect: (methodId: string) => void;
}) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [freeShipping, setFreeShipping] = useState(false);
  const [error, setError] = useState("");
  // Which address the options belong to. Loading is derived from it so the effect below never
  // writes state on its way in, only on its way out.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = Boolean(addressId) && loadedFor !== addressId;

  useEffect(() => {
    if (!addressId) return;
    let active = true;
    void fetch("/api/checkout/shipping-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message ?? "دریافت روش‌های ارسال انجام نشد.");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setOptions(result.methods ?? []);
        setFreeShipping(Boolean(result.freeShipping));
        setError("");
        // Pick the cheapest by default so the total is never blank while the reader decides.
        const cheapest = [...(result.methods ?? [])].sort((a: ShippingOption, b: ShippingOption) => a.price - b.price)[0];
        if (cheapest) onSelect(cheapest.methodId);
      })
      .catch((reason: Error) => { if (active) { setOptions([]); setError(reason.message); } })
      .finally(() => { if (active) setLoadedFor(addressId); });
    return () => { active = false; };
    // `onSelect` is a fresh closure each render; re-running on it would refetch on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressId]);

  if (!addressId) return null;

  return (
    <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Content className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Truck size={20} /></span>
          <div>
            <h2 className="m-0 text-base font-bold">روش ارسال</h2>
            <p className="mb-0 mt-1 text-xs text-[var(--muted)]">هزینه بر اساس وزن سفارش و مقصد محاسبه شده است.</p>
          </div>
        </div>

        <input type="hidden" name="shippingMethodId" value={selectedMethodId ?? ""} />

        {loading && <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Spinner size="sm" />در حال محاسبه هزینه ارسال…</div>}

        {!loading && error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}

        {!loading && !error && options.length === 0 && (
          <Alert status="warning"><Alert.Description>برای این مقصد روش ارسالی تعریف نشده است؛ هزینه ارسال طبق تنظیمات فروشگاه محاسبه می‌شود.</Alert.Description></Alert>
        )}

        {!loading && options.length > 0 && (
          <div className="grid gap-3">
            {options.map((option) => (
              <Button
                key={option.methodId}
                type="button"
                variant="secondary"
                aria-pressed={selectedMethodId === option.methodId}
                onPress={() => onSelect(option.methodId)}
                className={`h-auto min-h-20 justify-start gap-3 rounded-xl border p-4 text-right ${selectedMethodId === option.methodId ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><Truck size={22} /></span>
                <span className="min-w-0">
                  <strong className="block">{option.title}</strong>
                  <small className="mt-1 block font-normal text-[var(--muted)]">{option.carrier} · تحویل حدود {option.estimatedDays.toLocaleString("fa-IR")} روز کاری</small>
                </span>
                <span className="mr-auto shrink-0 text-sm font-bold">
                  {freeShipping || option.price === 0 ? "رایگان" : formatMoney(option.price, currency)}
                </span>
                {selectedMethodId === option.methodId && <Check size={18} className="shrink-0 text-[var(--brand-primary)]" />}
              </Button>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
