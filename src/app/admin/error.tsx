"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, LayoutDashboard } from "lucide-react";
import { BpButton } from "@/components/admin/blueprint/ui/button";

// Next 16.3 renamed the error-boundary recovery callback from `reset` to `retry`
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md).
export default function AdminErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[admin] Unhandled render error.", error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-12">
      <div className="bp-frame w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--bp-danger-bg)] text-[var(--bp-danger)]"><AlertTriangle size={26} /></span>
        <h3 className="m-0">خطایی پیش آمد</h3>
        <p className="bp-muted mb-0 mt-2 text-[13px] leading-7">مشکلی در نمایش این صفحه رخ داد. می‌توانید دوباره تلاش کنید یا به داشبورد بازگردید.</p>
        {error.digest && <p className="bp-muted mb-0 mt-2 text-[11px]" dir="ltr">کد خطا: {error.digest}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <BpButton type="button" variant="primary" onClick={() => retry()} className="gap-2"><RotateCw size={16} />تلاش دوباره</BpButton>
          <Link href="/admin" className="bp-btn bp-btn-secondary gap-2"><LayoutDashboard size={16} />بازگشت به داشبورد</Link>
        </div>
      </div>
    </div>
  );
}
