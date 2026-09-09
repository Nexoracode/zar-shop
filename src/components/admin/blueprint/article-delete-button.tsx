"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { BpButton } from "./ui/button";

export function ArticleDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await requestJson(`/api/admin/articles/${id}`, { method: "DELETE" }, { fallbackMessage: "حذف مقاله ناموفق بود." });
      setOpen(false);
      toast.success("مقاله حذف شد", { description: `مقالهٔ «${title}» حذف شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(requestErrorMessage(reason, "حذف مقاله ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BpButton isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" title="حذف مقاله" aria-label={`حذف مقاله ${title}`} onClick={() => { setError(""); setOpen(true); }}>
        <Trash2 size={15} strokeWidth={1.5} />
      </BpButton>
      <DeleteConfirmDialog
        open={open}
        itemName={title}
        description="با حذف این مقاله، متن و تنظیمات آن برای همیشه پاک می‌شود."
        error={error}
        loading={loading}
        onClose={() => { if (!loading) setOpen(false); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
