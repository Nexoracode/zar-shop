"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { BpButton } from "./ui/button";

/** Row-level delete, alongside the other icon actions — only ever enabled for a product with no sales. */
export function ProductDeleteButton({ id, name, disabled }: { id: string; name: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (disabled || loading) return;
    setLoading(true);
    setError("");
    try {
      await requestJson(`/api/products/${id}`, { method: "DELETE" }, { fallbackMessage: "حذف محصول ناموفق بود." });
      setOpen(false);
      toast.success("محصول حذف شد", { description: `محصول «${name}» با موفقیت حذف شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(requestErrorMessage(reason, "حذف محصول ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BpButton
        isIconOnly
        size="sm"
        variant="ghost"
        className="text-[var(--bp-danger)]"
        disabled={disabled}
        title={disabled ? "محصولی که فروش داشته قابل حذف نیست؛ به‌جای آن بایگانی کنید." : "حذف محصول"}
        aria-label={`حذف محصول ${name}`}
        onClick={() => { setError(""); setOpen(true); }}
      >
        <Trash2 size={15} strokeWidth={1.5} />
      </BpButton>
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
