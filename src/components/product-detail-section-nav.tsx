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
    let frameId = 0;

    const updateActiveSection = () => {
      frameId = 0;
      const activationLine = 104;
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

  return <nav className="sticky top-0 z-30 mt-10 flex w-full gap-7 overflow-x-auto border-b border-slate-200 bg-white/95 px-1 text-sm font-normal text-slate-600 backdrop-blur" aria-label="بخش‌های صفحه محصول">
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
  </nav>;
}
