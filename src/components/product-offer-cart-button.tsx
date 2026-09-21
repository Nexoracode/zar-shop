"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner, toast } from "@heroui/react";
import { Plus } from "lucide-react";

/**
 * "Add to cart" on a product card. A product that needs a choice first (its variants) can't be added from here, so the
 * shopper is taken to its page instead; a guest without checkout is taken to the login.
 */
export function ProductOfferCartButton({ productId, href }: { productId: string; href: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    try {
      const response = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: 1, selectedOptions: {} }) });
      const data = await response.json().catch(() => null);
      if (response.status === 401) { router.push("/login?next=/cart"); return; }
      if (response.status === 422) { router.push(href); return; }
      if (!response.ok) { toast.danger("افزودن به سبد انجام نشد", { description: data?.message ?? "لطفاً دوباره تلاش کنید." }); return; }
      toast.success("به سبد خرید اضافه شد");
      router.refresh();
    } catch {
      toast.danger("افزودن به سبد انجام نشد", { description: "ارتباط با سرور برقرار نشد." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" isPending={pending} onPress={() => void add()} className="mt-3 min-h-10 w-full gap-1.5 rounded-lg border-[var(--brand-primary)] text-sm font-bold text-[var(--brand-primary)]">
      {({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Plus size={16} />}افزودن به سبد</>}
    </Button>
  );
}
