"use client";

import { Button } from "@heroui/react";
import { ARTICLE_FONT_SIZE_STEP, useArticleFontSize } from "@/components/article-font-size-context";

export function ArticleFontSizeControl() {
  const { bump } = useArticleFontSize();
  return (
    <span className="mr-auto flex items-center gap-1">
      <Button type="button" isIconOnly size="sm" variant="ghost" aria-label="کوچک‌تر" onPress={() => bump(-ARTICLE_FONT_SIZE_STEP)} className="size-[26px] min-h-[26px] min-w-[26px] rounded-full border border-[var(--border)] text-[11px]">A-</Button>
      <Button type="button" isIconOnly size="sm" variant="ghost" aria-label="بزرگ‌تر" onPress={() => bump(ARTICLE_FONT_SIZE_STEP)} className="size-[26px] min-h-[26px] min-w-[26px] rounded-full border border-[var(--border)] text-[13px]">A+</Button>
    </span>
  );
}
