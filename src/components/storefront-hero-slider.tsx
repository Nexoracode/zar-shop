"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type StorefrontHeroSlide = {
  id: string;
  href: string;
  desktop: { src: string; alt: string };
  mobile?: { src: string; alt: string };
};

type Props = {
  slides: StorefrontHeroSlide[];
  contentMode: "WITH_CONTENT" | "IMAGE_ONLY";
  title: string;
  description: string;
  buttonLabel: string;
};

export function StorefrontHeroSlider({ slides, contentMode, title, description, buttonLabel }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, pointerId: -1, startX: 0, startY: 0, currentX: 0 });
  const animationTarget = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const hasMultipleSlides = slides.length > 1;
  const paused = hovered || dragging || animating;

  const startSlide = useCallback((direction: -1 | 1) => {
    if (!hasMultipleSlides || animating || animationTarget.current !== null) return;
    const width = sliderRef.current?.clientWidth ?? 0;
    if (!width) return;
    animationTarget.current = (activeIndex + direction + slides.length) % slides.length;
    setTransitionEnabled(true);
    setAnimating(true);
    setDragOffset(direction === 1 ? -width : width);
  }, [activeIndex, animating, hasMultipleSlides, slides.length]);

  useEffect(() => {
    if (!hasMultipleSlides || paused) return;
    const timer = window.setInterval(() => startSlide(1), 6000);
    return () => window.clearInterval(timer);
  }, [hasMultipleSlides, paused, startSlide]);

  function previous() {
    startSlide(-1);
  }

  function next() {
    startSlide(1);
  }

  function completeAnimation() {
    if (!animating) return;
    const target = animationTarget.current;
    if (target === null) {
      setAnimating(false);
      return;
    }
    setTransitionEnabled(false);
    setActiveIndex(target);
    setDragOffset(0);
    setAnimating(false);
    animationTarget.current = null;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setTransitionEnabled(true)));
  }

  function relativePosition(index: number) {
    let difference = index - activeIndex;
    const half = slides.length / 2;
    if (difference > half) difference -= slides.length;
    if (difference < -half) difference += slides.length;
    if (Math.abs(difference) === half && slides.length % 2 === 0) difference = dragOffset > 0 ? -Math.abs(difference) : Math.abs(difference);
    return difference;
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!hasMultipleSlides || animating || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.target instanceof Element && event.target.closest("button,[data-slider-control='true']")) return;
    drag.current = { active: true, moved: false, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, currentX: event.clientX };
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
    const deltaX = event.clientX - drag.current.startX;
    const deltaY = event.clientY - drag.current.startY;
    drag.current.currentX = event.clientX;
    if (!drag.current.moved) {
      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      drag.current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setTransitionEnabled(false);
      setDragging(true);
    }
    const width = sliderRef.current?.clientWidth ?? 0;
    setDragOffset(width ? Math.max(-width, Math.min(width, deltaX)) : deltaX);
    event.preventDefault();
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
    const moved = drag.current.moved;
    const deltaX = drag.current.currentX - drag.current.startX;
    drag.current.active = false;
    drag.current.moved = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    if (!moved) return;
    suppressClick.current = true;
    const threshold = Math.min(110, (sliderRef.current?.clientWidth ?? 300) * 0.18);
    if (!cancelled && Math.abs(deltaX) >= threshold) startSlide(deltaX < 0 ? 1 : -1);
    else {
      animationTarget.current = null;
      setTransitionEnabled(true);
      setAnimating(true);
      setDragOffset(0);
    }
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }

  return (
    <div ref={sliderRef} className={`relative h-[440px] touch-pan-y select-none overflow-hidden bg-[#e8dfd5] ${dragging ? "cursor-grabbing" : hasMultipleSlides ? "cursor-grab" : ""}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={(event) => finishDrag(event, true)} onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }} onDragStart={(event) => event.preventDefault()}>
      {slides.map((slide, index) => <Link href={slide.href} key={slide.id} aria-hidden={index !== activeIndex} tabIndex={index === activeIndex ? 0 : -1} aria-label={`مشاهده ${slide.desktop.alt}`} onTransitionEnd={(event) => { if (index === activeIndex && event.propertyName === "transform") completeAnimation(); }} style={{ transform: `translate3d(calc(${relativePosition(index) * 100}% + ${dragOffset}px), 0, 0)` }} className={`absolute inset-0 will-change-transform ${transitionEnabled ? "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" : ""} ${index === activeIndex && !dragging && !animating ? "z-[1]" : "z-0"} ${index === activeIndex ? "" : "pointer-events-none"}`}>
        {slide.mobile && <Image src={slide.mobile.src} alt={slide.mobile.alt} fill priority={index === 0} draggable={false} sizes="(max-width: 639px) 100vw, 0px" className="object-cover sm:hidden" />}
        <Image src={slide.desktop.src} alt={slide.desktop.alt} fill priority={index === 0} draggable={false} sizes="100vw" className={`object-cover ${slide.mobile ? "hidden sm:block" : ""}`} />
      </Link>)}

      {contentMode === "WITH_CONTENT" && <>
        <span className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-l from-black/35 via-transparent to-transparent" />
        <div className="pointer-events-none relative z-20 mx-auto flex h-full w-[min(1440px,calc(100%-32px))] items-center lg:w-[min(1440px,calc(100%-80px))]"><div className="max-w-[480px] text-white"><h1 className="m-0 text-[clamp(2.2rem,5vw,4.4rem)] font-black leading-[1.25]">{title}</h1><p className="mb-6 mt-3 text-sm text-white/85">{description}</p><Link href={slides[activeIndex]?.href ?? "/products"} data-slider-control="true" className="pointer-events-auto inline-flex h-11 items-center rounded-md bg-[var(--brand-primary)] px-6 text-xs text-[var(--brand-primary-foreground)]">{buttonLabel}</Link></div></div>
      </>}

      {hasMultipleSlides && <>
        <Button type="button" isIconOnly variant="secondary" aria-label="اسلاید قبلی" onPress={previous} className="absolute right-4 top-1/2 z-30 size-10 min-h-10 min-w-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/25 text-white backdrop-blur hover:bg-black/40"><ChevronRight size={19} /></Button>
        <Button type="button" isIconOnly variant="secondary" aria-label="اسلاید بعدی" onPress={next} className="absolute left-4 top-1/2 z-30 size-10 min-h-10 min-w-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/25 text-white backdrop-blur hover:bg-black/40"><ChevronLeft size={19} /></Button>
        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur" dir="rtl">{slides.map((slide, index) => <Button key={slide.id} type="button" isIconOnly variant="ghost" aria-label={`نمایش اسلاید ${(index + 1).toLocaleString("fa-IR")}`} aria-pressed={index === activeIndex} onPress={() => setActiveIndex(index)} className={`h-2 min-h-2 min-w-2 rounded-full p-0 transition-all ${index === activeIndex ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`} />)}</div>
      </>}
    </div>
  );
}
