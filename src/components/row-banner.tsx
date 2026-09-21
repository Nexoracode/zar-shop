"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * A picture that is exactly as tall as the row of product cards it sits in (it stretches to the row's height, which the
 * cards set) and `ratio` times that wide (1 = a square). CSS can't derive a width from a stretched height, so the height
 * is measured. Before it is measured it has a fixed width, so nothing jumps by much.
 */
export function RowBanner({ src, alt, href, ratio = 1, sizes = "600px", className = "" }: { src: string; alt: string; href?: string; /** Width as a multiple of the height. */ ratio?: number; sizes?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.round(node.getBoundingClientRect().height * ratio));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ratio]);

  const picture = (
    <span className="absolute inset-0 block overflow-hidden rounded-2xl bg-black/5">
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </span>
  );
  return (
    <div ref={ref} className={`relative min-h-[200px] shrink-0 snap-start self-stretch ${className}`} style={{ width: width ?? Math.round(260 * ratio) }}>
      {href ? <Link href={href} aria-label={alt} className="block size-full">{picture}</Link> : picture}
    </div>
  );
}
