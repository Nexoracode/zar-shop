"use client";

import { useEffect } from "react";

export function ProductActivityTracker({ productId, enabled }: { productId: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch(`/api/account/visits/${productId}`, { method: "POST", signal: controller.signal }).catch(() => undefined);
    return () => controller.abort();
  }, [enabled, productId]);
  return null;
}
