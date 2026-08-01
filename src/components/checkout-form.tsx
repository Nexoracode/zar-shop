"use client";
import { useState } from "react";
import { Alert, Button, Card, Input, Spinner, TextArea, toast } from "@heroui/react";
import { BadgePercent } from "lucide-react";

export function CheckoutForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.message ?? "ثبت سفارش ناموفق بود."); setLoading(false); return; }
    toast.success("سفارش با موفقیت ثبت شد", { description: "در حال انتقال به درگاه پرداخت هستید.", timeout: 4000 });
    window.setTimeout(() => window.location.assign(data.redirectUrl), 500);
  }

  const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20";
  const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";

  return (
    <Card className="rounded-2xl border border-[#e7e6e2] bg-white shadow-sm">
    <Card.Content>
    <form className="grid gap-4 p-1 sm:p-2" onSubmit={submit}>
      <h2 className="m-0 text-lg font-medium">اطلاعات تحویل و فاکتور</h2>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="recipient" className={labelClass}>نام تحویل‌گیرنده</label>
          <Input id="recipient" name="recipient" required fullWidth variant="secondary" className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="checkoutPhone" className={labelClass}>شماره تماس</label>
          <Input id="checkoutPhone" name="phone" dir="ltr" pattern="09[0-9]{9}" required fullWidth variant="secondary" className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="province" className={labelClass}>استان</label>
          <Input id="province" name="province" required fullWidth variant="secondary" className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="city" className={labelClass}>شهر</label>
          <Input id="city" name="city" required fullWidth variant="secondary" className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="postalCode" className={labelClass}>کد پستی</label>
        <Input id="postalCode" name="postalCode" dir="ltr" required fullWidth variant="secondary" className={fieldClass} />
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="addressLine" className={labelClass}>نشانی کامل</label>
        <TextArea id="addressLine" name="addressLine" rows={3} required fullWidth variant="secondary" className={fieldClass} />
      </div>

      <div className="grid gap-[7px] rounded-xl border border-violet-100 bg-violet-50/50 p-3">
        <label htmlFor="couponCode" className={`${labelClass} flex items-center gap-2`}><BadgePercent size={16} className="text-violet-600" />کد تخفیف</label>
        <Input id="couponCode" name="couponCode" dir="ltr" fullWidth variant="secondary" className={`${fieldClass} uppercase`} placeholder="اختیاری" />
        <span className="text-[11px] text-slate-500">اعتبار کد و مبلغ نهایی هنگام ثبت سفارش دوباره در سرور بررسی می‌شود.</span>
      </div>

      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}

      <Button
        type="submit"
        fullWidth
        variant="primary"
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] rounded-sm transition-all hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        isPending={loading}
      >
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ایجاد سفارش..." : "ثبت سفارش و پرداخت"}</>}
      </Button>
    </form>
    </Card.Content>
    </Card>
  );
}
