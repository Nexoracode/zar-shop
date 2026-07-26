"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

export function AddToCart({ productId, disabled, disabledLabel = "ناموجود" }: { productId: string; disabled: boolean; disabledLabel?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function add() {
    setLoading(true);
    setMsg("");
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const data = await r.json();
    setLoading(false);
    if (r.status === 401) { router.push("/login?next=/cart"); return; }
    setMsg(data.message ?? "");
    if (r.ok) router.refresh();
  }

  return (
    <div>
      <Button
        onPress={() => void add()}
        isDisabled={disabled || loading}
        fullWidth
        variant="primary"
        className="w-full min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center gap-[9px] border border-[#b5904c] rounded-sm bg-[#b5904c] text-white transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {disabled ? disabledLabel : loading ? "در حال افزودن..." : "افزودن به سبد"}
      </Button>
      {msg && <small className="block mt-2 text-[#785b27]">{msg}</small>}
    </div>
  );
}
