"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut } from "lucide-react";
import { BpButton } from "../ui";

export function SetupPendingNotice({ storeName }: { storeName: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div dir="rtl" className="bp-root grid min-h-dvh place-items-center bg-[var(--bp-bg)] p-5">
      <div className="bp-frame w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><Clock size={26} /></span>
        <h1 className="m-0 text-lg font-bold">راه‌اندازی فروشگاه در جریان است</h1>
        <p className="bp-muted mb-0 mt-3 text-[13px] leading-7">
          مدیر اصلی هنوز راه‌اندازی اولیهٔ {storeName} را کامل نکرده است. تا پایان این مرحله دسترسی به پنل مدیریت ممکن نیست.
        </p>
        <BpButton variant="danger" fullWidth isPending={loggingOut} onClick={() => void logout()} className="mt-6 justify-center gap-2">
          {!loggingOut && <LogOut size={15} />}خروج از حساب
        </BpButton>
      </div>
    </div>
  );
}
