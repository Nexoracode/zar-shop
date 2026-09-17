"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { Download } from "lucide-react";
import { BpButton } from "@/components/admin/blueprint/ui/button";

/** Downloads the report CSV. The heavy lifting is the `/admin/reports/export` route (it sets the
 * `Content-Disposition` header); this button just holds the in-flight state so it can disable
 * itself and show a spinner while the file is being built. */
export function ExportCsvButton({ params }: { params: Record<string, string> }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`/admin/reports/export${query ? `?${query}` : ""}`);
      if (!response.ok) throw new Error("خروجی گرفتن گزارش انجام نشد.");
      const blob = await response.blob();
      const name = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "sales-report.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.danger("خروجی CSV گرفته نشد", { description: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <BpButton variant="secondary" isPending={downloading} onClick={() => void download()}>
      {!downloading && <Download size={15} />}
      {downloading ? "در حال آماده‌سازی..." : "خروجی CSV"}
    </BpButton>
  );
}
