"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BuilderPart } from "@/components/builder-part";
import type { BannerSliderLayout } from "@/modules/page-builder/banners";
import type { BannerSlide } from "@/modules/page-builder/banner-sliders";

// How a slide is sized in each look. The peeking look centres a slide that is narrower than the row, so its
// neighbours show at the edges; the two-up look shows two slides at once from tablet width.
const slideClass: Record<BannerSliderLayout, string> = {
  SLIDER_FULL: "w-full aspect-[2/1] sm:aspect-[1920/440] snap-start",
  SLIDER_WIDE: "w-full aspect-[2.4/1] sm:aspect-[3.2/1] snap-start",
  SLIDER_CORNER: "w-full aspect-[2.4/1] sm:aspect-[3.2/1] snap-start",
  SLIDER_TWO_UP: "w-full aspect-[2.4/1] sm:w-[calc(50%-8px)] snap-start",
  SLIDER_PEEK: "w-[82%] aspect-[2.4/1] sm:w-[78%] sm:aspect-[3/1] snap-center",
};

const autoplayMs = 6000;

/**
 * A banner slider in one of four looks (`SLIDER_WIDE`, `SLIDER_CORNER`, `SLIDER_TWO_UP`, `SLIDER_PEEK`): a row of
 * banners that snaps as it scrolls, with arrows and position dots that the page builder can switch off (`arrows` and
 * `dots` parts of `sectionId`). It advances by itself and pauses while the pointer is over it or a finger is on it.
 */
export function BannerSlider({ sectionId, layout, slides, arrowsHidden = false, dotsHidden = false, editable = false }: { sectionId: string; layout: BannerSliderLayout; slides: BannerSlide[]; arrowsHidden?: boolean; dotsHidden?: boolean; editable?: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [active, setActive] = useState(0);
  const peek = layout === "SLIDER_PEEK";
  const showsArrows = layout !== "SLIDER_PEEK";
  const multiple = slides.length > 1;

  // The row is right-to-left, so a slide "starts" at its right edge.
  const offsetOf = useCallback((index: number) => {
    const row = rowRef.current;
    const target = row?.children[index] as HTMLElement | undefined;
    if (!row || !target) return 0;
    const rowRect = row.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    return peek ? rect.left + rect.width / 2 - (rowRect.left + row.clientWidth / 2) : rect.right - rowRect.right;
  }, [peek]);

  const goTo = useCallback((index: number) => {
    const row = rowRef.current;
    if (!row || !slides.length) return;
    const next = (index + slides.length) % slides.length;
    row.scrollTo({ left: row.scrollLeft + offsetOf(next), behavior: "smooth" });
  }, [offsetOf, slides.length]);

  // Which slide is at the reading edge (or the centre, for the peeking look) follows the scroll position.
  const onScroll = useCallback(() => {
    let best = 0;
    let distance = Infinity;
    for (let index = 0; index < slides.length; index += 1) {
      const gap = Math.abs(offsetOf(index));
      if (gap < distance) { distance = gap; best = index; }
    }
    setActive(best);
  }, [offsetOf, slides.length]);

  useEffect(() => {
    if (!multiple) return;
    const timer = window.setInterval(() => { if (!pausedRef.current) goTo(active + 1); }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [active, goTo, multiple]);

  if (!slides.length) return <p className="m-0 rounded-xl border border-dashed border-[#d5d9e0] bg-white p-6 text-center text-sm text-[#858b95]">این اسلایدر هنوز بنری ندارد.</p>;

  const arrowClass = "size-9 min-h-9 min-w-9 rounded-full border border-white/50 bg-white/85 text-[#232934] shadow-sm backdrop-blur hover:bg-white";
  const prev = <Button type="button" isIconOnly variant="secondary" aria-label="بنر قبلی" onPress={() => goTo(active - 1)} className={arrowClass}><ChevronRight size={18} /></Button>;
  const next = <Button type="button" isIconOnly variant="secondary" aria-label="بنر بعدی" onPress={() => goTo(active + 1)} className={arrowClass}><ChevronLeft size={18} /></Button>;

  return (
    <div className="min-w-0" onMouseEnter={() => { pausedRef.current = true; }} onMouseLeave={() => { pausedRef.current = false; }} onTouchStart={() => { pausedRef.current = true; }} onTouchEnd={() => { pausedRef.current = false; }}>
      <div className="relative">
        <div ref={rowRef} dir="rtl" onScroll={onScroll} className={`flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${layout === "SLIDER_FULL" ? "" : "gap-4"}`}>
          {slides.map((slide, index) => (
            <Link key={slide.id} href={slide.href} aria-label={slide.desktop.alt} className={`relative block shrink-0 overflow-hidden bg-black/5 ${layout === "SLIDER_FULL" ? "" : "rounded-xl"} ${slideClass[layout]}`}>
              {slide.mobile && <Image src={slide.mobile.src} alt={slide.mobile.alt} fill priority={index === 0} sizes="100vw" className="object-cover sm:hidden" />}
              <Image src={slide.desktop.src} alt={slide.desktop.alt} fill priority={index === 0} sizes={layout === "SLIDER_TWO_UP" ? "(max-width: 640px) 100vw, 50vw" : "100vw"} className={`object-cover ${slide.mobile ? "hidden sm:block" : ""}`} />
            </Link>
          ))}
        </div>
        {multiple && showsArrows && (
          <BuilderPart section={sectionId} id="arrows" hidden={arrowsHidden} editable={editable}>
            {layout === "SLIDER_CORNER"
              ? <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">{prev}{next}</div>
              : <>
                <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">{prev}</div>
                <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2">{next}</div>
              </>}
          </BuilderPart>
        )}
      </div>
      {multiple && (
        <BuilderPart section={sectionId} id="dots" hidden={dotsHidden} editable={editable}>
          <div className="mt-3 flex items-center justify-center gap-1.5" dir="rtl">
            {slides.map((slide, index) => <Button key={slide.id} type="button" isIconOnly variant="ghost" aria-label={`نمایش بنر ${(index + 1).toLocaleString("fa-IR")}`} aria-pressed={index === active} onPress={() => goTo(index)} className={`h-2 min-h-2 min-w-2 rounded-full p-0 transition-all ${index === active ? "w-6 bg-[var(--brand-primary)]" : "w-2 bg-[#c9ced6] hover:bg-[#aab1bc]"}`} />)}
          </div>
        </BuilderPart>
      )}
    </div>
  );
}
