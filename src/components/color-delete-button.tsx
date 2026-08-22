"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

export function ColorDeleteButton({ id, name, iconOnly = false }: { id: string; name: string; iconOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/colors/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = response.status === 204 ? null : await response.json().catch(() => null);
        throw new Error(result?.message ?? "حذف رنگ ناموفق بود.");
      }
      setOpen(false);
      toast.success("رنگ حذف شد", { description: `رنگ «${name}» با موفقیت حذف شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حذف رنگ ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="danger-soft" isIconOnly={iconOnly} aria-label={`حذف ${name}`} isDisabled={loading} onPress={() => { setError(""); setOpen(true); }} className={iconOnly ? "h-9 min-h-9 w-9 min-w-9 rounded-lg" : "min-h-9 gap-1 px-3 text-xs font-bold"}>
        <Trash2 size={14} />{iconOnly ? null : "حذف"}
      </Button>
      <DeleteConfirmDialog
        open={open}
        itemName={name}
        description="با حذف این رنگ، دیگر برای تعریف تنوع محصولات قابل انتخاب نخواهد بود."
        error={error}
        loading={loading}
        onClose={() => { if (!loading) setOpen(false); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
