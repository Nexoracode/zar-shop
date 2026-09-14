"use client";

import { useEffect } from "react";

/**
 * Measures the sticky storefront header so a table-of-contents jump (`#s0`, `#s1`, ...) lands the
 * heading below it instead of hiding it underneath — same pattern as `ProductDetailSectionNav`'s
 * `--product-detail-anchor-offset`, just without that page's compact-top-bar swap.
 */
export function ArticleAnchorOffset() {
  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>(".storefront-shell > header");

    const update = () => {
      const height = header && getComputedStyle(header).position === "sticky" ? Math.round(header.getBoundingClientRect().height) : 0;
      root.style.setProperty("--blog-anchor-offset", `${height + 16}px`);
    };

    update();
    const resizeObserver = header ? new ResizeObserver(update) : null;
    if (header) resizeObserver.observe(header);
    window.addEventListener("resize", update);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--blog-anchor-offset");
    };
  }, []);

  return null;
}
