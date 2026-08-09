"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
  showNavigation?: boolean;
};

export function DragScrollRow({ children, className = "", ariaLabel, showNavigation = false }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, pointerId: -1, startX: 0, startScrollLeft: 0, lastX: 0, lastTime: 0, velocity: 0, targetScrollLeft: 0 });
  const dragFrame = useRef<number | null>(null);
  const momentumFrame = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const updateNavigation = useCallback(() => {
    const row = rowRef.current;
    if (!row || row.children.length === 0) return;
    const viewport = row.getBoundingClientRect();
    const first = row.children[0].getBoundingClientRect();
    const last = row.children[row.children.length - 1].getBoundingClientRect();
    const isFullyVisible = (item: DOMRect) => item.left >= viewport.left - 2 && item.right <= viewport.right + 2;
    setCanGoBack(!isFullyVisible(first));
    setCanGoForward(!isFullyVisible(last));
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || !showNavigation) return;
    updateNavigation();
    row.addEventListener("scroll", updateNavigation, { passive: true });
    const observer = new ResizeObserver(updateNavigation);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", updateNavigation);
      observer.disconnect();
    };
  }, [showNavigation, updateNavigation]);

  useEffect(() => () => {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    if (momentumFrame.current !== null) cancelAnimationFrame(momentumFrame.current);
  }, []);

  function cancelMotion() {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    if (momentumFrame.current !== null) cancelAnimationFrame(momentumFrame.current);
    dragFrame.current = null;
    momentumFrame.current = null;
  }

  function renderDragPosition() {
    const row = rowRef.current;
    if (!row) return;
    const remaining = drag.current.targetScrollLeft - row.scrollLeft;
    row.scrollLeft += remaining * 0.42;
    if (drag.current.active || Math.abs(remaining) > 0.4) {
      dragFrame.current = requestAnimationFrame(renderDragPosition);
    } else {
      row.scrollLeft = drag.current.targetScrollLeft;
      dragFrame.current = null;
    }
  }

  function startMomentum(initialVelocity: number) {
    const row = rowRef.current;
    if (!row || Math.abs(initialVelocity) < 0.35) return;
    let velocity = initialVelocity;
    const move = () => {
      if (!rowRef.current || drag.current.active) {
        momentumFrame.current = null;
        return;
      }
      const previous = rowRef.current.scrollLeft;
      rowRef.current.scrollLeft += velocity;
      velocity *= 0.94;
      if (Math.abs(velocity) > 0.18 && rowRef.current.scrollLeft !== previous) {
        momentumFrame.current = requestAnimationFrame(move);
      } else {
        momentumFrame.current = null;
      }
    };
    momentumFrame.current = requestAnimationFrame(move);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !rowRef.current) return;
    cancelMotion();
    drag.current = { active: true, moved: false, pointerId: event.pointerId, startX: event.clientX, startScrollLeft: rowRef.current.scrollLeft, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, targetScrollLeft: rowRef.current.scrollLeft };
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || !rowRef.current) return;
    const distance = event.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(distance) <= 4) return;
    if (!drag.current.moved) {
      drag.current.moved = true;
      rowRef.current.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }
    const elapsed = Math.max(1, event.timeStamp - drag.current.lastTime);
    const instantVelocity = (event.clientX - drag.current.lastX) / elapsed;
    drag.current.velocity = drag.current.velocity * 0.68 + instantVelocity * 0.32;
    drag.current.lastX = event.clientX;
    drag.current.lastTime = event.timeStamp;
    drag.current.targetScrollLeft = drag.current.startScrollLeft + distance;
    if (dragFrame.current === null) dragFrame.current = requestAnimationFrame(renderDragPosition);
    event.preventDefault();
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
    drag.current.active = false;
    if (rowRef.current?.hasPointerCapture(event.pointerId)) rowRef.current.releasePointerCapture(event.pointerId);
    if (dragFrame.current !== null) {
      cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
    const releasedQuickly = event.timeStamp - drag.current.lastTime < 120;
    if (drag.current.moved && releasedQuickly) startMomentum(drag.current.velocity * 16);
    setIsDragging(false);
  }

  function scrollCards(forward: boolean) {
    const row = rowRef.current;
    if (!row || row.children.length === 0) return;
    const viewport = row.getBoundingClientRect();
    const items = Array.from(row.children) as HTMLElement[];
    const firstVisible = items.findIndex((item) => {
      const rect = item.getBoundingClientRect();
      return rect.left < viewport.right && rect.right > viewport.left;
    });
    const itemWidth = items[0].getBoundingClientRect().width;
    const visibleCount = Math.max(1, Math.floor(row.clientWidth / itemWidth));
    const currentIndex = Math.max(0, firstVisible);
    const targetIndex = forward
      ? Math.min(items.length - 1, currentIndex + visibleCount)
      : Math.max(0, currentIndex - visibleCount);
    items[targetIndex].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  function captureClick(event: MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return <div className="relative min-w-0">
    <div ref={rowRef} dir="rtl" tabIndex={0} aria-label={ariaLabel} className={`${className} select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onClickCapture={captureClick} onDragStart={(event) => event.preventDefault()}>{children}</div>
    {showNavigation && canGoBack && <Button type="button" isIconOnly variant="secondary" aria-label={`${ariaLabel}، موارد قبلی`} onPress={() => scrollCards(false)} className="absolute right-2 top-1/2 z-20 hidden size-11 min-h-11 min-w-11 -translate-y-1/2 rounded-full border border-[#d8dce2] bg-white text-[#3f4652] shadow-md hover:bg-[#f7f8fa] sm:inline-flex"><ChevronRight size={21} /></Button>}
    {showNavigation && canGoForward && <Button type="button" isIconOnly variant="secondary" aria-label={`${ariaLabel}، موارد بعدی`} onPress={() => scrollCards(true)} className="absolute left-2 top-1/2 z-20 hidden size-11 min-h-11 min-w-11 -translate-y-1/2 rounded-full border border-[#d8dce2] bg-white text-[#3f4652] shadow-md hover:bg-[#f7f8fa] sm:inline-flex"><ChevronLeft size={21} /></Button>}
  </div>;
}
