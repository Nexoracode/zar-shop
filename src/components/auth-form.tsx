"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "خطایی رخ داد."); setLoading(false); return; }
    router.push(mode === "login" ? "/account" : "/");
    router.refresh();
  }

  const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[#b5904c] focus:shadow-[0_0_0_3px_rgba(181,144,76,0.1)]";
  const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {mode === "register" && (
        <div className="grid grid-cols-2 gap-[14px]">
          <div className="grid gap-[7px]">
            <label htmlFor="firstName" className={labelClass}>نام</label>
            <input id="firstName" name="firstName" required minLength={2} className={fieldClass} />
          </div>
          <div className="grid gap-[7px]">
            <label htmlFor="lastName" className={labelClass}>نام خانوادگی</label>
            <input id="lastName" name="lastName" required minLength={2} className={fieldClass} />
          </div>
        </div>
      )}

      <div className="grid gap-[7px]">
        <label htmlFor="email" className={labelClass}>ایمیل</label>
        <input id="email" name="email" type="email" dir="ltr" required className={fieldClass} />
      </div>

      {mode === "register" && (
        <div className="grid gap-[7px]">
          <label htmlFor="phone" className={labelClass}>شماره موبایل</label>
          <input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="09123456789" required className={fieldClass} />
        </div>
      )}

      <div className="grid gap-[7px]">
        <label htmlFor="password" className={labelClass}>رمز عبور</label>
        <input id="password" name="password" type="password" dir="ltr" minLength={8} required className={fieldClass} />
      </div>

      {error && <div className="text-[#a33b32] bg-[#fff0ed] px-3 py-[10px] text-[0.86rem]">{error}</div>}

      <button
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#1c3155] text-white border border-[#1c3155] rounded-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "در حال بررسی..." : mode === "login" ? "ورود امن" : "ساخت حساب"}
      </button>
    </form>
  );
}
