"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// How much of the row's height the picture takes (both its height and, through the ratio, its width shrink with it).
const scale = 0.82;

/**
 * A picture that sits in a row of product cards: as tall as `scale` of the row (set by its neighbours), centered
 * vertically, and `ratio` times that wide (1 = a square). CSS can't derive a width from a stretched height, so the row's
 * height is measured. Before it is measured it has a fixed width, so nothing jumps by much.
 */
export function RowBanner({ src, alt, href, ratio = 1, sizes = "600px" }: { src: string; alt: string; href?: string; /** Width as a multiple of the picture's height. */ ratio?: number; sizes?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setRowHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const height = rowHeight ? Math.round(rowHeight * scale) : null;
  const picture = (
    <span className="absolute inset-0 block overflow-hidden rounded-2xl bg-black/5">
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </span>
  );
  return (
    <div ref={ref} className="relative min-h-[200px] shrink-0 snap-start self-stretch" style={{ width: height ? Math.round(height * ratio) : Math.round(220 * ratio) }}>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: height ?? "82%" }}>
        {href ? <Link href={href} aria-label={alt} className="block size-full">{picture}</Link> : picture}
      </div>
    </div>
  );
}
