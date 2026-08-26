"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";

export function ShippingMethodDeleteButton({ id, title, orderCount, iconOnly = false }: {
  id: string;
  title: string;
  /** Past orders reference the method, and the API refuses to cut that link. */
  orderCount: number;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await requestJson(`/api/admin/shipping-methods/${id}`, { method: "DELETE" }, { fallbackMessage: "حذف روش ارسال ناموفق بود." });
      setOpen(false);
      toast.success("روش ارسال حذف شد", { description: `روش «${title}» با موفقیت حذف شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(requestErrorMessage(reason, "حذف روش ارسال ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="danger-soft" isIconOnly={iconOnly} aria-label={`حذف ${title}`} isDisabled={loading} onPress={() => { setError(""); setOpen(true); }} className={iconOnly ? "h-9 min-h-9 w-9 min-w-9 rounded-lg" : "min-h-9 gap-1 px-3 text-xs font-bold"}>
        <Trash2 size={14} />{iconOnly ? null : "حذف"}
      </Button>
      <DeleteConfirmDialog
        open={open}
        itemName={title}
        description={orderCount > 0
          ? `این روش در ${orderCount.toLocaleString("fa-IR")} سفارش استفاده شده است و قابل حذف نیست؛ برای برداشتنش از تسویه حساب، آن را غیرفعال کنید.`
          : "با حذف این روش، دیگر در تسویه حساب به مشتری نمایش داده نمی‌شود."}
        error={error}
        loading={loading}
        onClose={() => { if (!loading) setOpen(false); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
