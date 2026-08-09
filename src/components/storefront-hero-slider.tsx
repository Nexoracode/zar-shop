"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  const drag = useRef({ active: false, moved: false, pointerId: -1, startX: 0, startY: 0, currentX: 0 });
  const suppressClick = useRef(false);
  const hasMultipleSlides = slides.length > 1;
  const paused = hovered || dragging;

  useEffect(() => {
    if (!hasMultipleSlides || paused) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [hasMultipleSlides, paused, slides.length]);

  function previous() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function next() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!hasMultipleSlides || (event.pointerType === "mouse" && event.button !== 0)) return;
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
      setDragging(true);
    }
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
    if (!cancelled && Math.abs(deltaX) >= 50) {
      if (deltaX < 0) next();
      else previous();
    }
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }

  return (
    <div className={`relative h-[440px] touch-pan-y select-none overflow-hidden bg-[#e8dfd5] ${dragging ? "cursor-grabbing" : hasMultipleSlides ? "cursor-grab" : ""}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={(event) => finishDrag(event, true)} onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }} onDragStart={(event) => event.preventDefault()}>
      {slides.map((slide, index) => <Link href={slide.href} key={slide.id} aria-hidden={index !== activeIndex} tabIndex={index === activeIndex ? 0 : -1} aria-label={`مشاهده ${slide.desktop.alt}`} className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? "z-0 opacity-100" : "pointer-events-none opacity-0"}`}>
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
