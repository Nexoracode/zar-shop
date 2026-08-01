"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { RefreshCw } from "lucide-react";

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
