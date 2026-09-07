"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Heart } from "lucide-react";

/**
 * The heart on a product card. Sits inside the card's `<Link>`, so it swallows the click before
 * it turns into navigation, then toggles `/api/account/favorites/[id]`. A guest is sent to login.
 */
export function ProductFavoriteButton({ productId, initialFavorite = false, className = "" }: {
  productId: string;
  initialFavorite?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const next = !favorite;
    setBusy(true);
    setFavorite(next);
    try {
      const response = await fetch(`/api/account/favorites/${productId}`, { method: next ? "PUT" : "DELETE" });
      if (response.status === 401) {
        setFavorite(!next);
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!response.ok) throw new Error();
      toast.success(next ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
    } catch {
      setFavorite(!next);
      toast.danger("تغییر علاقه‌مندی انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorite}
      aria-label={favorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      className={`grid size-7 place-items-center rounded-full bg-white/90 text-slate-500 transition hover:text-[var(--danger)] disabled:opacity-60 ${className}`}
      disabled={busy}
    >
      <Heart size={15} className={favorite ? "fill-[var(--danger)] text-[var(--danger)]" : ""} />
    </button>
  );
}
