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
    const storefrontHeader = document.querySelector<HTMLElement>(".storefront-shell > header");

    const updateStickyOffsets = () => {
      const headerOffset = storefrontHeader && getComputedStyle(storefrontHeader).position === "sticky"
        ? Math.round(storefrontHeader.getBoundingClientRect().height)
        : 0;
      root.style.setProperty("--storefront-sticky-header-offset", `${headerOffset}px`);
      root.style.setProperty("--product-detail-anchor-offset", `${headerOffset + 96}px`);
    };

    updateStickyOffsets();
    const resizeObserver = storefrontHeader ? new ResizeObserver(updateStickyOffsets) : null;
    if (storefrontHeader) resizeObserver?.observe(storefrontHeader);
    window.addEventListener("resize", updateStickyOffsets);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateStickyOffsets);
      root.style.removeProperty("--storefront-sticky-header-offset");
      root.style.removeProperty("--product-detail-anchor-offset");
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
          aria-current={active ? "location" : undefined}
          onClick={() => setActiveSection(section.id)}
          className={`relative shrink-0 py-4 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-opacity ${active ? "text-rose-500 after:bg-rose-500 after:opacity-100" : "hover:text-slate-900 after:opacity-0"}`}
        >{section.label}</Link>;
      })}
    </nav>
  </div>;
}
