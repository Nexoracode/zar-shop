"use client";

import { useEffect } from "react";

/** Fires once on mount — a public, anonymous page-view beacon (no auth gate, unlike `ProductActivityTracker`). */
export function ArticleViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/articles/${articleId}/view`, { method: "POST", signal: controller.signal }).catch(() => undefined);
    return () => controller.abort();
  }, [articleId]);
  return null;
}
