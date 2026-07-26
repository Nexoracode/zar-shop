"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Trash2 } from "lucide-react";

export function CategoryDeleteButton({ id, name, disabled }: { id: string; name: string; disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (disabled || !window.confirm(`دسته «${name}» حذف شود؟`)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف دسته‌بندی ناموفق بود.");
      router.refresh();
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "حذف دسته‌بندی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return <Button type="button" size="sm" variant="danger-soft" isDisabled={disabled || loading} onPress={() => void remove()} className="min-h-9 gap-1 px-3 text-xs font-bold"><Trash2 size={14} />{loading ? "در حال حذف" : "حذف"}</Button>;
}
