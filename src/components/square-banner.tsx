"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * A square picture that is exactly as tall as the row it sits in: it stretches to the row's height (set by its
 * neighbours — the product cards) and takes that height as its own width. CSS can't derive a width from a stretched
 * height, so the height is measured. Before it is measured it has a fixed width, so nothing jumps by much.
 */
export function SquareBanner({ src, alt, href, sizes = "430px" }: { src: string; alt: string; href?: string; sizes?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setSide(Math.round(node.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const picture = (
    <span className="absolute inset-0 block overflow-hidden rounded-2xl bg-black/5">
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </span>
  );
  return (
    <div ref={ref} className="relative min-h-[200px] shrink-0 snap-start self-stretch" style={{ width: side ?? 260 }}>
      {href ? <Link href={href} aria-label={alt} className="block size-full">{picture}</Link> : picture}
    </div>
  );
}
