"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner, toast } from "@heroui/react";
import { Check, Undo2 } from "lucide-react";

export function ContactMessageResolveToggle({ id, isResolved }: { id: string; isResolved: boolean }) {
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
    <Button type="button" size="sm" variant={isResolved ? "secondary" : "primary"} isPending={saving} onPress={() => void toggle()} className="min-h-9 gap-1.5 px-3 text-xs font-bold">
      {({ isPending }) => <>{isPending ? <Spinner size="sm" color="current" /> : isResolved ? <Undo2 size={14} /> : <Check size={14} />}{isPending ? "در حال ثبت..." : isResolved ? "بازگشایی" : "بررسی‌شد"}</>}
    </Button>
  );
}
