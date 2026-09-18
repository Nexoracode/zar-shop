"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, RefreshCw } from "lucide-react";
import { BpButton } from "@/components/admin/blueprint/ui/button";

export function AdminTableRefreshButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return <BpButton
    isIconOnly
    size="sm"
    isPending={isRefreshing}
    aria-label="بروزرسانی اطلاعات جدول"
    onClick={() => startRefresh(() => router.refresh())}
    className={`shrink-0 ${className}`}
  >
    {!isRefreshing && <RefreshCw size={15} />}
  </BpButton>;
}

export function AdminReadOnlyTableToolbar({ label = "جدول فقط‌خواندنی", description = "این اطلاعات برای حفظ سابقه قابل ویرایش نیستند.", trailing }: { label?: string; description?: string; /** Rendered before the refresh button — e.g. a column-visibility toggle. */ trailing?: ReactNode }) {
  return (
    <div className="hidden items-center gap-3 border-b border-[var(--bp-divider)] px-4 py-3 md:flex">
      <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><LockKeyhole size={16} /></span>
      <div className="min-w-0"><strong className="block text-[13px]">{label}</strong><span className="bp-muted block truncate text-[11px]">{description}</span></div>
      <div className="ms-auto flex items-center gap-2">
        {trailing}
        <AdminTableRefreshButton />
      </div>
    </div>
  );
}
