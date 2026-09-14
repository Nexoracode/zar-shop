"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const sections = [
  { id: "introduction", label: "معرفی" },
  { id: "specifications", label: "مشخصات" },
  { id: "reviews", label: "دیدگاه‌ها" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export function ProductDetailSectionNav() {
  const [activeSection, setActiveSection] = useState<SectionId>("introduction");

  useEffect(() => {
    const root = document.documentElement;
    // Below lg this page swaps the storefront header for its own compact top bar (see
    // ProductDetailTopBar/globals.css) — whichever one is actually visible at the current
    // breakpoint is the one whose height the offsets below need to account for.
    const storefrontHeader = document.querySelector<HTMLElement>(".storefront-shell > header");
    const compactTopBar = document.querySelector<HTMLElement>("[data-product-top-bar]");
    const detailNavigation = document.querySelector<HTMLElement>('nav[aria-label="بخش‌های صفحه محصول"]');

    const updateStickyOffsets = () => {
      const activeHeader = [storefrontHeader, compactTopBar].find(
        (el) => el && getComputedStyle(el).position === "sticky" && el.getBoundingClientRect().height > 0,
      );
      const headerOffset = activeHeader ? Math.round(activeHeader.getBoundingClientRect().height) : 0;
      const navigationHeight = Math.round(detailNavigation?.getBoundingClientRect().height ?? 53);
      root.style.setProperty("--storefront-sticky-header-offset", `${headerOffset}px`);
      root.style.setProperty("--product-primary-purchase-offset", `${headerOffset + 24}px`);
      root.style.setProperty("--product-detail-anchor-offset", `${headerOffset + 96}px`);
      root.style.setProperty("--product-detail-purchase-offset", `${headerOffset + navigationHeight + 24}px`);
    };

    updateStickyOffsets();
    const resizeObserver = storefrontHeader || compactTopBar || detailNavigation ? new ResizeObserver(updateStickyOffsets) : null;
    if (storefrontHeader) resizeObserver?.observe(storefrontHeader);
    if (compactTopBar) resizeObserver?.observe(compactTopBar);
    if (detailNavigation) resizeObserver?.observe(detailNavigation);
    window.addEventListener("resize", updateStickyOffsets);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateStickyOffsets);
      root.style.removeProperty("--storefront-sticky-header-offset");
      root.style.removeProperty("--product-primary-purchase-offset");
      root.style.removeProperty("--product-detail-anchor-offset");
      root.style.removeProperty("--product-detail-purchase-offset");
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const updateActiveSection = () => {
      frameId = 0;
      const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--storefront-sticky-header-offset")) || 0;
      const activationLine = headerOffset + 104;
      let nextSection: SectionId = "introduction";

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= activationLine) nextSection = section.id;
      }

      setActiveSection(nextSection);
    };

    const handleScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <div className="sticky z-40 mt-10 w-full bg-white/95 backdrop-blur" style={{ top: "var(--storefront-sticky-header-offset, 0px)" }}>
    <nav className="flex w-full gap-7 overflow-x-auto border-b border-slate-200 px-1 text-sm font-normal text-slate-600" aria-label="بخش‌های صفحه محصول">
      {sections.map((section) => {
        const active = activeSection === section.id;
        return <Link
          key={section.id}
          href={`#${section.id}`}
          replace
          aria-current={active ? "location" : undefined}
          onClick={() => setActiveSection(section.id)}
          className={`relative shrink-0 py-4 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-opacity ${active ? "text-[var(--brand-primary)] after:bg-[var(--brand-primary)] after:opacity-100" : "hover:text-[var(--brand-primary)] after:opacity-0"}`}
        >{section.label}</Link>;
      })}
    </nav>
  </div>;
}
