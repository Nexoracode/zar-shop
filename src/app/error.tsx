"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { Button, Card } from "@/components/hero";

// Next 16.3 renamed the error-boundary recovery callback from `reset` to `retry`
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md).
export default function GlobalErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[app] Unhandled render error.", error);
  }, [error]);

  return (
    <main className="grid min-h-[65vh] place-items-center px-4 py-16">
      <Card variant="secondary" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle size={26} /></span>
        <h1 className="m-0 text-lg font-bold text-[var(--foreground)]">خطایی پیش آمد</h1>
        <p className="mb-0 mt-2 text-sm leading-7 text-[var(--muted)]">مشکلی در نمایش این صفحه رخ داد. می‌توانید دوباره تلاش کنید یا به صفحه اصلی بازگردید.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onPress={() => retry()} className="min-h-11 gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary-foreground)]"><RotateCw size={17} />تلاش دوباره</Button>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-bold text-[var(--foreground)] transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"><Home size={17} />بازگشت به صفحه اصلی</Link>
        </div>
      </Card>
    </main>
  );
}
