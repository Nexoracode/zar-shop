"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const BASE_FONT_SIZE_PX = 14.5;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.3;
const STEP = 0.1;

type FontSizeContextValue = { fontSizePx: number; bump: (delta: number) => void };

const FontSizeContext = createContext<FontSizeContextValue>({ fontSizePx: BASE_FONT_SIZE_PX, bump: () => {} });

/** Shared font-scale state between the meta row's A-/A+ control and the body content, which sit far apart in the tree. */
export function ArticleFontSizeProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  const value = useMemo<FontSizeContextValue>(() => ({
    fontSizePx: +(BASE_FONT_SIZE_PX * scale).toFixed(1),
    bump: (delta: number) => setScale((current) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(current + delta).toFixed(2)))),
  }), [scale]);
  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useArticleFontSize() {
  return useContext(FontSizeContext);
}

export const ARTICLE_FONT_SIZE_STEP = STEP;
