"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Spinner } from "@heroui/react";
import { Plus } from "lucide-react";
import { TextField } from "@/components/form-field";
import { formatMoney } from "@/lib/format";
import { normalizeNumericValue, toPersianDigits } from "@/lib/persian-numbers";

type Method = { id: string; name: string };

const PRESETS = [200_000, 500_000, 1_000_000, 2_000_000];

export function WalletTopupForm({ min, max, currency, methods }: { min: number; max: number; currency: "IRR" | "IRT"; methods: Method[] }) {
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState(methods[0]?.id ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const numeric = useMemo(() => Number(normalizeNumericValue(amount, false) || 0), [amount]);
  const presets = PRESETS.filter((value) => value >= min && value <= max);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (numeric < min) { setError(`حداقل مبلغ افزایش اعتبار ${formatMoney(min, currency)} است.`); return; }
    if (numeric > max) { setError(`حداکثر مبلغ افزایش اعتبار ${formatMoney(max, currency)} است.`); return; }
    if (!provider) { setError("درگاه پرداختی برای فروشگاه پیکربندی نشده است."); return; }
    setLoading(true);
    const response = await fetch("/api/account/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: numeric, paymentProvider: provider }) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.redirectUrl) { setError(data?.message ?? "شروع پرداخت انجام نشد."); setLoading(false); return; }
    window.location.assign(data.redirectUrl);
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <TextField
        tone="auth"
        label="مبلغ افزایش اعتبار"
        id="topup-amount"
        inputMode="numeric"
        dir="ltr"
        value={amount ? toPersianDigits(normalizeNumericValue(amount, false)) : ""}
        onChange={(event) => { setAmount(event.target.value); setError(""); }}
        hint={`بین ${formatMoney(min, currency)} تا ${formatMoney(max, currency)}`}
        reserveMessage={false}
      />
      <div className="flex flex-wrap gap-2">
        {presets.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => { setAmount(String(value)); setError(""); }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            <Plus size={13} />{formatMoney(value, currency)}
          </button>
        ))}
      </div>
      {methods.length > 1 && (
        <div className="grid gap-1.5">
          <span className="text-xs font-bold text-[var(--muted)]">درگاه پرداخت</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {methods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setProvider(method.id)}
                className={`rounded-lg border px-3 py-2 text-right text-sm transition ${provider === method.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-[var(--border)]"}`}
              >
                {method.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" isPending={loading} isDisabled={!provider} className="min-h-11 gap-2 rounded-lg bg-[var(--brand-primary)] px-5 font-bold text-[var(--brand-primary-foreground)]">
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال انتقال به درگاه..." : "پرداخت و افزایش اعتبار"}</>}
      </Button>
      <p className="m-0 text-[11px] leading-6 text-[var(--muted)]">پس از پرداخت موفق، مبلغ بلافاصله به کیف پول شما اضافه می‌شود.</p>
    </form>
  );
}
