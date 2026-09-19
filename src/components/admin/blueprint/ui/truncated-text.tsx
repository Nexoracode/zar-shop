"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Text cut to one line with an ellipsis, whose full text appears in the panel's tooltip — but only
 * while it really is cut off. Text that fits has nothing more to say, so it gets no tooltip.
 *
 * Whether it is cut depends on the width it is laid out at, which only the browser knows, so it is
 * measured after mount and again whenever the box is resized (a narrower window, a column toggled
 * on). Until then — and on the server — it renders without a tooltip, so nothing mismatches.
 */
export function BpTruncated({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setClipped(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return <span ref={ref} className={`block truncate ${className}`.trim()} data-bp-tip={clipped ? text : undefined}>{text}</span>;
}
