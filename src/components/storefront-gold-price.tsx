"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

export function StorefrontGoldPrice({ initialPrice, currency, live }: { initialPrice: number | null; currency: "IRR" | "IRT"; live: boolean }) {
  const [price, setPrice] = useState(initialPrice);
  useEffect(() => {
    if (!live) return;
    const refresh = async () => {
      const response = await fetch("/api/gold-price", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json().catch(() => null);
      const next = Number(result?.pricePerGram18);
      if (Number.isFinite(next)) setPrice(next);
    };
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [live]);
  return <>{price === null ? "نرخ طلا موقتاً در دسترس نیست" : `طلای ۱۸ عیار: ${formatMoney(price, currency)}`}</>;
}
