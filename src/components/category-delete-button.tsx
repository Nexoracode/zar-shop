"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

export function CategoryDeleteButton({ id, name, disabled }: { id: string; name: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (disabled || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف دسته‌بندی ناموفق بود.");
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حذف دسته‌بندی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="danger-soft" isDisabled={disabled || loading} onPress={() => { setError(""); setOpen(true); }} className="min-h-9 gap-1 px-3 text-xs font-bold">
        <Trash2 size={14} />حذف
      </Button>
      <DeleteConfirmDialog
        open={open}
        itemName={name}
        description="با حذف این دسته‌بندی، اطلاعات آن برای همیشه پاک می‌شود. دسته‌هایی که محصول یا زیردسته دارند قابل حذف نیستند."
        error={error}
        loading={loading}
        confirmLabel="حذف دسته‌بندی"
        onClose={() => { if (!loading) setOpen(false); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
