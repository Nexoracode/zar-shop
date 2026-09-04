"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Check, Undo2 } from "lucide-react";
import { BpButton } from "./ui/button";

export function BlueprintContactMessageResolveToggle({ id, isResolved, fullWidth = false }: { id: string; isResolved: boolean; fullWidth?: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/contact-messages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isResolved: !isResolved }) });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message ?? "تغییر وضعیت انجام نشد.");
      }
      toast.success(isResolved ? "پیام به بررسی‌نشده تغییر کرد" : "پیام بررسی‌شده علامت‌گذاری شد");
      router.refresh();
    } catch (error) {
      toast.danger("تغییر وضعیت انجام نشد", { description: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <BpButton size="sm" fullWidth={fullWidth} variant={isResolved ? "secondary" : "primary"} isPending={saving} onClick={() => void toggle()} className="gap-1.5">
      {isResolved ? <Undo2 size={14} /> : <Check size={14} />}{saving ? "در حال ثبت..." : isResolved ? "بازگشایی" : "بررسی‌شد"}
    </BpButton>
  );
}
