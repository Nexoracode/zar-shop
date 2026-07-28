"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

export function CategoryDeleteButton({ id, name, disabled, iconOnly = false }: { id: string; name: string; disabled: boolean; iconOnly?: boolean }) {
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
      toast.success("دسته‌بندی حذف شد", { description: `دسته‌بندی «${name}» با موفقیت حذف شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حذف دسته‌بندی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="danger-soft" isIconOnly={iconOnly} aria-label={`حذف دسته‌بندی ${name}`} isDisabled={disabled || loading} onPress={() => { setError(""); setOpen(true); }} className={iconOnly ? "h-9 min-h-9 w-9 min-w-9 rounded-lg" : "min-h-9 gap-1 px-3 text-xs font-bold"}>
        <Trash2 size={14} />{iconOnly ? null : "حذف"}
      </Button>
      <DeleteConfirmDialog
        open={open}
        itemName={name}
        description="با حذف این دسته‌بندی، اطلاعات آن برای همیشه پاک می‌شود. دسته‌هایی که محصول یا زیردسته دارند قابل حذف نیستند."
        error={error}
        loading={loading}
        onClose={() => { if (!loading) setOpen(false); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
