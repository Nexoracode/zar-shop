"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GeneralCategoryMegaMenu, type MenuCategory } from "@/storefront/general/category-mega-menu";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";

export function GeneralHeaderMenuRow({ categories, menuItems, deliveryHref }: { categories: MenuCategory[]; menuItems: HomepageMenuItem[]; deliveryHref: string }) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const direction = useRef<"up" | "down">("up");
  const distance = useRef(0);
  const visibleRef = useRef(true);
  const lockedUntil = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let frame = 0;

    function updateVisibility(nextVisible: boolean) {
      if (visibleRef.current === nextVisible) return;
      visibleRef.current = nextVisible;
      distance.current = 0;
      lockedUntil.current = performance.now() + 380;
      setVisible(nextVisible);
    }

    function handleScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const current = Math.max(window.scrollY, 0);
        if (performance.now() < lockedUntil.current) {
          lastScrollY.current = current;
          distance.current = 0;
          frame = 0;
          return;
        }

        const delta = current - lastScrollY.current;
        const nextDirection = delta > 0 ? "down" : delta < 0 ? "up" : direction.current;

        if (nextDirection !== direction.current) {
          direction.current = nextDirection;
          distance.current = 0;
        }
        distance.current += Math.abs(delta);

        if (current < 32) updateVisibility(true);
        else if (nextDirection === "down" && current > 80 && distance.current > 14) {
          updateVisibility(false);
        } else if (nextDirection === "up" && distance.current > 8) {
          updateVisibility(true);
        }

        lastScrollY.current = current;
        frame = 0;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={`relative hidden border-t border-slate-100 bg-white transition-[max-height,opacity,transform,border-color] duration-300 ease-out lg:block ${visible ? "max-h-12 translate-y-0 overflow-visible opacity-100" : "pointer-events-none max-h-0 -translate-y-3 overflow-hidden border-transparent opacity-0"}`} aria-hidden={!visible}>
      <div className="flex h-12 items-stretch px-10">
        <nav className="flex h-full min-w-0 items-stretch gap-8 text-xs" aria-label="دسته‌بندی محصولات">
          <GeneralCategoryMegaMenu key={visible ? "visible" : "hidden"} categories={categories} enabled={visible} />
          {menuItems.map((item) => (
            <Link key={item.id} href={item.href} className="relative flex h-full shrink-0 items-center transition after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[var(--brand-primary)] after:content-[''] after:transition-transform after:duration-300 after:ease-out hover:text-[var(--brand-primary)] hover:after:scale-x-100 focus-visible:text-[var(--brand-primary)] focus-visible:after:scale-x-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href={deliveryHref} className="mr-auto flex shrink-0 items-center gap-2 pr-6 text-[11px] text-slate-600 transition hover:text-[var(--brand-primary)]">
          <MapPin size={17} />
          انتخاب نشانی تحویل
        </Link>
      </div>
    </div>
  );
}
