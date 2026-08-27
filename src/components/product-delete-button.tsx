"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

export function ProductDeleteButton({ id, name, disabled, iconOnly = false }: { id: string; name: string; disabled: boolean; iconOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (disabled || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف محصول ناموفق بود.");
      setOpen(false);
      toast.success("محصول حذف شد", { description: `محصول «${name}» با موفقیت حذف شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حذف محصول ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="danger-soft"
        isIconOnly={iconOnly}
        aria-label={`حذف محصول ${name}`}
        title={disabled ? "محصولی که فروش داشته قابل حذف نیست؛ به‌جای آن بایگانی کنید." : "حذف محصول"}
        isDisabled={disabled || loading}
        onPress={() => { setError(""); setOpen(true); }}
        className={iconOnly ? "h-9 min-h-9 w-9 min-w-9 rounded-lg" : "min-h-10 gap-1.5 rounded-xl text-xs font-bold"}
      >
        <Trash2 size={14} />{iconOnly ? null : "حذف محصول"}
      </Button>
      <DeleteConfirmDialog
        open={open}
        itemName={name}
        description="با حذف این محصول، اطلاعات، تصاویر و تنوع‌های آن برای همیشه پاک می‌شود."
        error={error}
        loading={loading}
        onClose={() => { if (!loading) setOpen(false); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
