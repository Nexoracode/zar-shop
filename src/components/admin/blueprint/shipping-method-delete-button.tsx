"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { BpButton } from "./ui/button";

/** Row-level delete, alongside the edit link — only ever enabled for a method with no orders. */
export function ShippingMethodDeleteButton({ id, title, orderCount }: {
  id: string;
  title: string;
  /** Past orders reference the method, and the API refuses to cut that link. */
  orderCount: number;
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
      <BpButton
        isIconOnly
        size="sm"
        variant="ghost"
        className="bp-btn-danger-icon"
        disabled={loading}
        title="حذف روش ارسال"
        aria-label={`حذف ${title}`}
        onClick={() => { setError(""); setOpen(true); }}
      >
        <Trash2 size={15} strokeWidth={1.5} />
      </BpButton>
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
