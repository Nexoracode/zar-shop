"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { LockKeyhole, RefreshCw } from "lucide-react";

export function AdminTableRefreshButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return <Button
    type="button"
    isIconOnly
    size="sm"
    variant="secondary"
    isPending={isRefreshing}
    aria-label="بروزرسانی اطلاعات جدول"
    onPress={() => startRefresh(() => router.refresh())}
    className={`h-9 min-h-9 w-9 min-w-9 shrink-0 rounded-lg border border-[var(--border)] text-[var(--muted)] ${className}`}
  >
    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
  </Button>;
}

export function AdminReadOnlyTableToolbar({ label = "جدول فقط‌خواندنی", description = "این اطلاعات برای حفظ سابقه قابل ویرایش نیستند." }: { label?: string; description?: string }) {
  return (
    <div className="hidden items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 md:flex">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><LockKeyhole size={16} /></span>
      <div className="min-w-0"><strong className="block text-xs text-slate-700">{label}</strong><span className="block truncate text-[10px] text-slate-400">{description}</span></div>
      <AdminTableRefreshButton className="mr-auto" />
    </div>
  );
}
