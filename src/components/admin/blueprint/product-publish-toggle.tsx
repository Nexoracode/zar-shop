"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CircleCheck } from "lucide-react";
import { toast } from "@heroui/react";
import type { ProductStatus } from "@generated/prisma/enums";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BpButton } from "./ui/button";

/** Row-level publish/unpublish switch from the mockup's action group. */
export function ProductPublishToggle({ id, name, status }: { id: string; name: string; status: ProductStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const published = status === "ACTIVE";
  const title = published ? "برداشتن از انتشار" : "انتشار محصول";

  async function toggle() {
    setPending(true);
    try {
      await requestJson(`/api/admin/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: published ? "DRAFT" : "ACTIVE" }),
      }, { fallbackMessage: "تغییر وضعیت انجام نشد." });
      toast.success(published ? "محصول از انتشار خارج شد" : "محصول منتشر شد", { description: name });
      router.refresh();
    } catch (reason) {
      toast.danger("تغییر وضعیت انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setPending(false);
    }
  }

  return (
    <BpButton variant="ghost" isIconOnly size="sm" isPending={pending} title={title} aria-label={`${title}: ${name}`} onClick={() => void toggle()}>
      {!pending && (published ? <Ban size={15} strokeWidth={1.5} /> : <CircleCheck size={15} strokeWidth={1.5} />)}
    </BpButton>
  );
}
