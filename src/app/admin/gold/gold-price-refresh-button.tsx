"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { requestErrorMessage, requestJson } from "@/lib/api-request";

export function GoldPriceRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      await requestJson("/api/admin/gold/refresh", { method: "POST" }, { fallbackMessage: "دریافت نرخ تازه انجام نشد." });
      toast.success("نرخ طلا بروزرسانی شد");
      router.refresh();
    } catch (error) {
      toast.danger("دریافت نرخ تازه انجام نشد", { description: requestErrorMessage(error, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <BpButton variant="primary" isPending={loading} onClick={() => void refresh()} className="gap-2">
      {!loading && <RefreshCw size={15} />}
      {loading ? "در حال دریافت..." : "دریافت نرخ تازه"}
    </BpButton>
  );
}
