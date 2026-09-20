"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, ProgressBar } from "@heroui/react";
import { ChevronLeft, ChevronRight, Ellipsis, ImageIcon, Info, List, Play, X } from "lucide-react";
import { useSelectedProductOptions } from "@/components/add-to-cart";
import { AmazingOfferMark } from "@/components/amazing-offer-mark";
import { CompareButton } from "@/components/compare-button";
import type { CompareItem } from "@/modules/compare/compare";
import { selectionSignature } from "@/modules/products/variant-combinations";

type ProductGalleryMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  alt: string;
};

/** Whether a combination (or, with an empty `selection`, the product itself) is on sale — one
 * entry per combination the reader could pick, so the badge follows whatever is actually chosen
 * instead of showing a sale that belongs to a different colour. */
type SelectionDiscount = { selection: Record<string, string>; hasDiscount: boolean; discountEndsAt: string | null };

type ProductDetailGalleryProps = {
  media: ProductGalleryMedia[];
  productName: string;
  productCode: string;
  ticketHref: string;
  discountBySelection?: SelectionDiscount[];
  soldPercent?: number;
  compareItem?: CompareItem;
};


function formatCountdown(endAt: string | null | undefined, now: number) {
  if (!endAt) return null;
  const remaining = Math.max(0, new Date(endAt).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((value) => value.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false })).join(":");
  return { days, clock };
}

function GalleryMedia({ item, productName, priority = false, modal = false }: { item: ProductGalleryMedia | undefined; productName: string; priority?: boolean; modal?: boolean }) {
  if (!item) return <div className="grid h-full place-items-center gap-3 text-slate-300"><ImageIcon size={52} /><span className="text-xs">تصویری برای این محصول ثبت نشده است</span></div>;
  if (item.type === "VIDEO") return <video key={item.id} src={item.url} controls className="h-full w-full object-contain" aria-label={item.alt || `ویدیوی ${productName}`} />;
  return <Image src={item.url} alt={item.alt || productName} fill priority={priority} sizes={modal ? "90vw" : "(max-width: 1024px) 100vw, 38vw"} className={`object-contain ${modal ? "p-2 sm:p-5" : "p-3 sm:p-5"}`} />;
}

function FullscreenGallery({ media, selected, selectedIndex, productName, onSelect, onStep }: { media: ProductGalleryMedia[]; selected: ProductGalleryMedia | undefined; selectedIndex: number; productName: string; onSelect: (id: string) => void; onStep: (index: number) => void }) {
  return <Modal.Backdrop isDismissable={false} className="z-[120] !bg-black !backdrop-blur-none">
    <Modal.Container size="full" placement="center" className="h-dvh w-screen max-w-none p-0">
      <Modal.Dialog aria-label={`گالری تصاویر ${productName}`} className="h-dvh w-screen max-w-none overflow-hidden rounded-none bg-black text-white shadow-none" dir="rtl">
        <Modal.Header className="absolute inset-x-0 top-0 z-20 flex-row items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4 sm:p-6">
          <span className="text-xs text-white/70">{(selectedIndex + 1).toLocaleString("fa-IR")} از {media.length.toLocaleString("fa-IR")}</span>
          <Modal.CloseTrigger aria-label="بستن گالری" className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X size={25} /></Modal.CloseTrigger>
        </Modal.Header>
        <Modal.Body className="relative h-dvh overflow-hidden p-0">
          <div className="absolute inset-x-3 bottom-28 top-16 sm:inset-x-[12vw] sm:bottom-32 sm:top-20">
            <div className="relative mx-auto h-full max-w-[900px] overflow-hidden bg-white"><GalleryMedia item={selected} productName={productName} modal /></div>
            {media.length > 1 && <><Button type="button" isIconOnly variant="secondary" aria-label="تصویر قبلی" onPress={() => onStep(selectedIndex - 1)} className="absolute right-2 top-1/2 size-11 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-white text-slate-700 shadow-lg sm:-right-14"><ChevronRight size={23} /></Button><Button type="button" isIconOnly variant="secondary" aria-label="تصویر بعدی" onPress={() => onStep(selectedIndex + 1)} className="absolute left-2 top-1/2 size-11 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-white text-slate-700 shadow-lg sm:-left-14"><ChevronLeft size={23} /></Button></>}
          </div>
          <div className="absolute inset-x-3 bottom-4 flex items-end justify-between gap-4 sm:inset-x-6">
            <div className="flex max-w-[calc(100vw-130px)] gap-2 overflow-x-auto rounded-xl bg-black/70 p-1.5">
              {media.map((item) => <Button key={item.id} type="button" isIconOnly variant="secondary" aria-label={`نمایش ${item.alt || productName}`} onPress={() => onSelect(item.id)} className={`relative size-16 min-h-16 min-w-16 overflow-hidden rounded-md border-2 bg-white p-0 sm:size-[72px] sm:min-h-[72px] sm:min-w-[72px] ${item.id === selected?.id ? "border-white" : "border-transparent opacity-75 hover:opacity-100"}`}>{item.type === "IMAGE" ? <Image src={item.url} alt={item.alt || productName} fill sizes="72px" className="object-contain p-1" /> : <><video src={item.url} muted className="h-full w-full object-cover" aria-hidden="true" /><span className="absolute inset-0 grid place-items-center bg-black/25 text-white"><Play size={18} fill="currentColor" /></span></>}</Button>)}
            </div>
            <span className="inline-flex min-h-16 min-w-[82px] flex-col items-center justify-center gap-1 rounded-lg border border-white/30 bg-black/50 px-3 text-[10px] font-bold text-white"><ImageIcon size={21} />همه تصاویر</span>
          </div>
        </Modal.Body>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>;
}

export function ProductDetailGallery({ media, productName, productCode, ticketHref, discountBySelection = [], soldPercent = 0, compareItem }: ProductDetailGalleryProps) {
  const router = useRouter();
  const selectedOptions = useSelectedProductOptions();
  const viewportRef = useRef<HTMLDivElement>(null);
  // The entry matching whatever is currently picked — the base product's own entry has an empty
  // `selection`, which is also what a product with no combinations, or no pick made yet, reads as.
  const activeDiscount = useMemo(() => {
    const signature = selectionSignature(selectedOptions);
    return discountBySelection.find((entry) => selectionSignature(entry.selection) === signature) ?? discountBySelection[0] ?? null;
  }, [discountBySelection, selectedOptions]);
  const hasDiscount = activeDiscount?.hasDiscount ?? false;
  const discountEndsAt = activeDiscount?.discountEndsAt ?? null;
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? "");
  // The clock is only read inside effects, never while rendering: a `Date.now()` during render
  // differs between the server, the prerender and hydration (and Next refuses to prerender it).
  // `now` stays null until the effect below first sets it, so the countdown text is absent on
  // every first pass and identical between the server and the client.
  const [now, setNow] = useState<number | null>(null);
  const selectedIndex = Math.max(0, media.findIndex((item) => item.id === selectedId));
  const selected = media[selectedIndex] ?? media[0];
  const previewMedia = useMemo(() => media.slice(0, 5), [media]);
  const countdown = now !== null ? formatCountdown(discountEndsAt, now) : null;
  // Known at server-render time already, unlike `countdown` — a "فروش ویژه" has no window to
  // wait on, so its badge does not have to hold for hydration the way the countdown text does.
  const hasSchedule = Boolean(discountEndsAt);
  const showBadge = hasDiscount && (hasSchedule ? Boolean(countdown) : true);
  const normalizedSoldPercent = Math.min(100, Math.max(0, soldPercent));
  const showSoldProgress = normalizedSoldPercent > 50;

  /*
   * The price, the badge and the countdown are all rendered on the server, so a reader sitting on
   * the page keeps seeing the discounted price after the window closes. When the clock reaches the
   * end, `router.refresh()` re-runs the server components and the page settles on the real price
   * without a full reload.
   *
   * A hidden tab throttles `setInterval` to roughly once a minute, so the same check runs again
   * as soon as the tab is looked at, rather than waiting for the next throttled tick.
   */
  useEffect(() => {
    if (!hasDiscount || !discountEndsAt) return;
    const endsAt = new Date(discountEndsAt).getTime();
    if (Number.isNaN(endsAt)) return;
    let refreshed = false;

    function check() {
      const current = Date.now();
      setNow(current);
      if (current < endsAt || refreshed) return;
      refreshed = true;
      router.refresh();
    }

    // First reading right after mount (the countdown is blank until `now` is set), then every second.
    const first = window.setTimeout(check, 0);
    const timer = window.setInterval(check, 1000);
    function onVisible() { if (document.visibilityState === "visible") check(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [discountEndsAt, hasDiscount, router]);

  // While a click-triggered smooth scroll is animating, its own scroll events pass through
  // intermediate slides — the scroll-sync effect below would round those to the *previous*
  // slide for roughly the first half of the animation, flashing the thumbnail highlight back
  // before it settles back on the one just picked. Suppress that sync until the scroll ends.
  const suppressScrollSyncRef = useRef(false);

  function scrollToIndex(index: number) {
    const el = viewportRef.current;
    if (!el || index < 0) return;
    suppressScrollSyncRef.current = true;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  // Keeps the thumbnail row / fullscreen picker and the swipeable main viewport in sync — either
  // one can drive the selection, so both paths go through this instead of just setting state.
  function selectId(id: string) {
    setSelectedId(id);
    scrollToIndex(media.findIndex((item) => item.id === id));
  }

  function selectAt(index: number) {
    if (!media.length) return;
    const normalized = (index + media.length) % media.length;
    selectId(media[normalized].id);
  }

  // The main viewport is a native horizontal scroller (snap-x) so touch swipe comes free from
  // the browser; this just reads back which slide ended up centered to keep `selectedId` (and
  // therefore the thumbnail highlight + counter) in sync when the reader swipes instead of taps.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || media.length < 2) return;
    let frame = 0;
    function onScroll() {
      if (frame || suppressScrollSyncRef.current) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!el) return;
        const width = el.clientWidth || 1;
        const index = Math.min(media.length - 1, Math.max(0, Math.round(el.scrollLeft / width)));
        const item = media[index];
        if (item) setSelectedId(item.id);
      });
    }
    function onScrollEnd() { suppressScrollSyncRef.current = false; }
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [media]);

  const actions = [
    { label: "مشخصات محصول", icon: <List size={22} />, onPress: () => document.getElementById("specifications")?.scrollIntoView({ behavior: "smooth" }) },
  ];
  const actionButtonClass = "!size-10 !min-h-10 !min-w-10 rounded-full text-slate-700 hover:bg-[var(--surface-tertiary)] hover:text-[var(--brand-primary)]";

  return <section className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1" aria-label="گالری محصول">
    {showBadge && <div className="mb-5 flex min-h-12 items-center gap-3 px-3 text-[11px] font-bold text-[var(--danger)] sm:gap-4 sm:px-5 sm:text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, white)" }}>{hasSchedule ? <AmazingOfferMark className="h-[34px] w-[148px] shrink-0" /> : <span className="shrink-0">فروش ویژه</span>}{showSoldProgress && <div className="flex min-w-0 flex-1 items-center gap-2 text-slate-500"><span className="shrink-0 font-medium"><strong className="text-[var(--danger)]">{normalizedSoldPercent.toLocaleString("fa-IR")}٪</strong> فروش رفته</span><ProgressBar value={normalizedSoldPercent} aria-label="درصد فروش محصول" dir="ltr" className="min-w-8 flex-1"><ProgressBar.Track className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--danger) 18%, white)" }}><ProgressBar.Fill className="h-full rounded-full bg-[var(--danger)]" /></ProgressBar.Track></ProgressBar></div>}{hasSchedule && countdown && <span dir="ltr" className={`${showSoldProgress ? "" : "mr-auto"} flex shrink-0 items-center gap-2 whitespace-nowrap tabular-nums`}>{countdown.days > 0 && <span dir="rtl" className="inline-flex h-7 items-center rounded-md border bg-white/70 px-2 text-[10px] font-bold text-[var(--danger)] sm:text-[11px]" style={{ borderColor: "color-mix(in srgb, var(--danger) 28%, white)" }}>{countdown.days.toLocaleString("fa-IR")} روز</span>}<bdi dir="ltr">{countdown.clock}</bdi></span>}</div>}

    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex shrink-0 flex-row gap-1 sm:w-10 sm:flex-col" aria-label="عملیات محصول">
        {actions.map((action) => <Button key={action.label} type="button" isIconOnly variant="ghost" size="sm" aria-label={action.label} onPress={action.onPress} className={actionButtonClass}>{action.icon}</Button>)}
        {compareItem && <CompareButton item={compareItem} variant="icon" className={`${actionButtonClass} !border-0`} />}
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl">
        {media.length > 0 ? (
          <div ref={viewportRef} dir="ltr" className="flex aspect-square snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {media.map((item, index) => <div key={item.id} className="relative grid w-full shrink-0 snap-center place-items-center bg-white"><GalleryMedia item={item} productName={productName} priority={index === 0} /></div>)}
          </div>
        ) : <div className="grid aspect-square place-items-center bg-white"><GalleryMedia item={undefined} productName={productName} /></div>}
        {media.length > 1 && <span dir="ltr" className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">{(selectedIndex + 1).toLocaleString("fa-IR")} / {media.length.toLocaleString("fa-IR")}</span>}
      </div>
    </div>

    {media.length > 1 && <div className="mt-4 flex items-stretch justify-center gap-2 overflow-x-auto pb-1" role="group" aria-label="انتخاب تصویر محصول">
      {previewMedia.map((item) => <Button key={item.id} type="button" isIconOnly variant="secondary" aria-label={`نمایش ${item.alt || productName}`} aria-pressed={item.id === selected?.id} onPress={() => selectId(item.id)} className={`relative size-[74px] min-h-[74px] min-w-[74px] overflow-hidden rounded-lg border bg-white p-0 ${item.id === selected?.id ? "border-[var(--brand-accent)]" : "border-slate-200 hover:border-[var(--brand-accent)]"}`}>
        {item.type === "IMAGE" ? <Image src={item.url} alt={item.alt || productName} fill sizes="74px" className="object-contain p-1.5" /> : <><video src={item.url} muted className="h-full w-full object-cover" aria-hidden="true" /><span className="absolute inset-0 grid place-items-center bg-black/20 text-white"><Play size={20} fill="currentColor" /></span></>}
      </Button>)}
      <Modal>
        <Button type="button" isIconOnly variant="secondary" aria-label="مشاهده همه تصاویر" className="relative size-[74px] min-h-[74px] min-w-[74px] cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0 outline-none hover:border-[var(--brand-accent)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">
          {media[media.length - 1]?.type === "IMAGE" && <Image src={media[media.length - 1].url} alt="" fill sizes="74px" className="scale-110 object-cover blur-[5px]" />}
          <span className="absolute inset-0 grid place-items-center bg-white/45 text-slate-700"><Ellipsis size={28} /></span>
        </Button>
        <FullscreenGallery media={media} selected={selected} selectedIndex={selectedIndex} productName={productName} onSelect={selectId} onStep={selectAt} />
      </Modal>
    </div>}
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-1 text-[11px] text-slate-400"><Link href={ticketHref} className="inline-flex items-center gap-1.5 transition hover:text-[var(--brand-primary)]"><Info size={15} />گزارش مشخصات کالا یا موارد قانونی</Link><span dir="ltr">{productCode}</span></div>

  </section>;
}
