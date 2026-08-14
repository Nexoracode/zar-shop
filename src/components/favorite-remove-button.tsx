"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@heroui/react";
import { Trash2 } from "lucide-react";

export function FavoriteRemoveButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/account/favorites/${productId}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) { toast.danger("حذف از علاقه‌مندی‌ها انجام نشد"); return; }
    toast.success("از علاقه‌مندی‌ها حذف شد"); router.refresh();
  }
  return <Button type="button" variant="ghost" fullWidth isPending={busy} onPress={() => void remove()} className="justify-start gap-2 text-xs text-[var(--danger)]"><Trash2 size={16} />حذف از علاقه‌مندی‌ها</Button>;
}
