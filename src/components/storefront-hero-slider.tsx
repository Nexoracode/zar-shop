"use client";

import { useEffect, useState } from "react";
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
  const [paused, setPaused] = useState(false);
  const hasMultipleSlides = slides.length > 1;

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

  return (
    <div className="relative h-[440px] overflow-hidden bg-[#e8dfd5]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((slide, index) => <Link href={slide.href} key={slide.id} aria-hidden={index !== activeIndex} tabIndex={index === activeIndex ? 0 : -1} aria-label={`مشاهده ${slide.desktop.alt}`} className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? "z-0 opacity-100" : "pointer-events-none opacity-0"}`}>
        {slide.mobile && <Image src={slide.mobile.src} alt={slide.mobile.alt} fill priority={index === 0} sizes="(max-width: 639px) 100vw, 0px" className="object-cover sm:hidden" />}
        <Image src={slide.desktop.src} alt={slide.desktop.alt} fill priority={index === 0} sizes="100vw" className={`object-cover ${slide.mobile ? "hidden sm:block" : ""}`} />
      </Link>)}

      {contentMode === "WITH_CONTENT" && <>
        <span className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-l from-black/35 via-transparent to-transparent" />
        <div className="pointer-events-none relative z-20 mx-auto flex h-full w-[min(1440px,calc(100%-32px))] items-center lg:w-[min(1440px,calc(100%-80px))]"><div className="max-w-[480px] text-white"><h1 className="m-0 text-[clamp(2.2rem,5vw,4.4rem)] font-black leading-[1.25]">{title}</h1><p className="mb-6 mt-3 text-sm text-white/85">{description}</p><Link href={slides[activeIndex]?.href ?? "/products"} className="pointer-events-auto inline-flex h-11 items-center rounded-md bg-[var(--brand-primary)] px-6 text-xs text-[var(--brand-primary-foreground)]">{buttonLabel}</Link></div></div>
      </>}

      {hasMultipleSlides && <>
        <Button type="button" isIconOnly variant="secondary" aria-label="اسلاید قبلی" onPress={previous} className="absolute right-4 top-1/2 z-30 size-10 min-h-10 min-w-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/25 text-white backdrop-blur hover:bg-black/40"><ChevronRight size={19} /></Button>
        <Button type="button" isIconOnly variant="secondary" aria-label="اسلاید بعدی" onPress={next} className="absolute left-4 top-1/2 z-30 size-10 min-h-10 min-w-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/25 text-white backdrop-blur hover:bg-black/40"><ChevronLeft size={19} /></Button>
        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur" dir="rtl">{slides.map((slide, index) => <Button key={slide.id} type="button" isIconOnly variant="ghost" aria-label={`نمایش اسلاید ${(index + 1).toLocaleString("fa-IR")}`} aria-pressed={index === activeIndex} onPress={() => setActiveIndex(index)} className={`h-2 min-h-2 min-w-2 rounded-full p-0 transition-all ${index === activeIndex ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`} />)}</div>
      </>}
    </div>
  );
}
