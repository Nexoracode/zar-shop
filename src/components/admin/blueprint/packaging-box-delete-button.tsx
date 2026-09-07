"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { BpButton } from "./ui/button";

/** Row-level delete for a packaging box, alongside the edit link. */
export function PackagingBoxDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await requestJson(`/api/admin/packaging/${id}`, { method: "DELETE" }, { fallbackMessage: "حذف جعبه بسته‌بندی ناموفق بود." });
      setOpen(false);
      toast.success("جعبه بسته‌بندی حذف شد", { description: `جعبه «${name}» با موفقیت حذف شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(requestErrorMessage(reason, "حذف جعبه بسته‌بندی ناموفق بود."));
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
        title="حذف جعبه بسته‌بندی"
        aria-label={`حذف ${name}`}
        onClick={() => { setError(""); setOpen(true); }}
      >
        <Trash2 size={15} strokeWidth={1.5} />
      </BpButton>
      <DeleteConfirmDialog
        open={open}
        itemName={name}
        description="با حذف این جعبه، دیگر در محاسبه هزینه ارسال استفاده نمی‌شود."
        error={error}
        loading={loading}
        onClose={() => { if (!loading) setOpen(false); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
