"use client";
import { useState } from "react";

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
    <form
      className="grid gap-4 rounded-[4px] border border-[#e7e6e2] bg-white p-4 sm:p-[22px]"
      onSubmit={submit}
    >
      <h2 className="m-0 text-lg font-medium">اطلاعات تحویل و فاکتور</h2>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="recipient" className={labelClass}>نام تحویل‌گیرنده</label>
          <input id="recipient" name="recipient" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="checkoutPhone" className={labelClass}>شماره تماس</label>
          <input id="checkoutPhone" name="phone" dir="ltr" pattern="09[0-9]{9}" required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="province" className={labelClass}>استان</label>
          <input id="province" name="province" required className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="city" className={labelClass}>شهر</label>
          <input id="city" name="city" required className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="postalCode" className={labelClass}>کد پستی</label>
        <input id="postalCode" name="postalCode" dir="ltr" required className={fieldClass} />
      </div>

      <div className="grid gap-[7px]">
        <label htmlFor="addressLine" className={labelClass}>نشانی کامل</label>
        <textarea id="addressLine" name="addressLine" rows={3} required className={fieldClass} />
      </div>

      {error && <div className="text-[#a33b32] bg-[#fff0ed] px-3 py-[10px] text-[0.86rem]">{error}</div>}

      <button
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#b5904c] text-white border border-[#b5904c] rounded-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "در حال ایجاد سفارش..." : "ثبت سفارش و پرداخت"}
      </button>
    </form>
  );
}
