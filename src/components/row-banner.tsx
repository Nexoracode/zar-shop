"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Image from "next/image";
import Link from "next/link";

// A banner is shown whole, never cropped: its box takes the picture's own proportions (read once the picture has loaded;
// until then `fallbackRatio`). Very wide or very tall pictures are kept within these limits and shown whole inside the box.
const minRatio = 0.5;
const maxRatio = 2.5;

function useImageRatio(fallback: number) {
  const [ratio, setRatio] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const read = (image: HTMLImageElement) => {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) setRatio(image.naturalWidth / image.naturalHeight);
  };
  // A picture that was already loaded (cached) before the page became interactive never fires `onLoad` for React.
  useEffect(() => {
    if (imageRef.current?.complete) read(imageRef.current);
  }, []);
  return { ratio: Math.min(maxRatio, Math.max(minRatio, ratio ?? fallback)), onLoad: (event: SyntheticEvent<HTMLImageElement>) => read(event.currentTarget), imageRef };
}

/**
 * A picture that is exactly as tall as the row of product cards it sits in (it stretches to the row's height, which the
 * cards set) and as wide as its own proportions make it at that height, so the whole picture shows. CSS can't derive a
 * width from a stretched height, so the height is measured. Before it is measured (or loaded) it has a fixed width.
 */
export function RowBanner({ src, alt, href, fallbackRatio = 1, sizes = "600px", className = "" }: { src: string; alt: string; href?: string; /** Width as a multiple of the height, until the picture's own is known. */ fallbackRatio?: number; sizes?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const { ratio, onLoad, imageRef } = useImageRatio(fallbackRatio);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setRowHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const picture = (
    <span className="absolute inset-0 block overflow-hidden rounded-2xl bg-black/5">
      <Image ref={imageRef} src={src} alt={alt} fill sizes={sizes} onLoad={onLoad} className="object-contain" />
    </span>
  );
  return (
    <div ref={ref} className={`relative min-h-[200px] shrink-0 snap-start self-stretch ${className}`} style={{ width: rowHeight ? Math.round(rowHeight * ratio) : Math.round(260 * ratio) }}>
      {href ? <Link href={href} aria-label={alt} className="block size-full">{picture}</Link> : picture}
    </div>
  );
}

/** The phone form of a banner: the whole picture at the full width of its section, as tall as its proportions make it. */
export function FullWidthBanner({ src, alt, href, fallbackRatio = 4 / 3, className = "" }: { src: string; alt: string; href?: string; fallbackRatio?: number; className?: string }) {
  const { ratio, onLoad, imageRef } = useImageRatio(fallbackRatio);
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-black/5 ${className}`} style={{ aspectRatio: ratio }}>
      {href && <Link href={href} aria-label={alt} className="absolute inset-0 z-10" />}
      <Image ref={imageRef} src={src} alt={alt} fill sizes="100vw" onLoad={onLoad} className="object-contain" />
    </div>
  );
}
