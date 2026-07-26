"use client";
import { useState } from "react";
import { Alert, Button, Card, Input, TextArea } from "@heroui/react";

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
    window.location.assign(data.redirectUrl);
  }

  const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[#b5904c] focus:shadow-[0_0_0_3px_rgba(181,144,76,0.1)]";
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

      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}

      <Button
        type="submit"
        fullWidth
        variant="primary"
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#b5904c] text-white border border-[#b5904c] rounded-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        isDisabled={loading}
      >
        {loading ? "در حال ایجاد سفارش..." : "ثبت سفارش و پرداخت"}
      </Button>
    </form>
    </Card.Content>
    </Card>
  );
}
