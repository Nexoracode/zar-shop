"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button, Modal, ProgressBar, toast } from "@heroui/react";
import { Bell, ChartNoAxesCombined, ChevronLeft, ChevronRight, Ellipsis, Heart, ImageIcon, Info, List, Play, Scale, Share2, X } from "lucide-react";

type ProductGalleryMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  alt: string;
};

type ProductDetailGalleryProps = {
  productId: string;
  media: ProductGalleryMedia[];
  productName: string;
  productCode: string;
  hasDiscount?: boolean;
  discountEndsAt?: string | null;
  soldPercent?: number;
  authenticated?: boolean;
  initialFavorite?: boolean;
};

const noopSubscribe = () => () => undefined;

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

function renderFullscreenGallery({ media, selected, selectedIndex, productName, onSelect, onStep }: { media: ProductGalleryMedia[]; selected: ProductGalleryMedia | undefined; selectedIndex: number; productName: string; onSelect: (id: string) => void; onStep: (index: number) => void }) {
  return <Modal.Backdrop isDismissable={false} className="z-[120] !bg-black !backdrop-blur-none">
    <Modal.Container size="full" placement="center" className="h-dvh w-screen max-w-none p-0">
      <Modal.Dialog aria-label={`گالری تصاویر ${productName}`} className="h-dvh w-screen max-w-none overflow-hidden rounded-none bg-black text-white shadow-none" dir="rtl">
        <Modal.Header className="absolute inset-x-0 top-0 z-20 flex-row items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4 sm:p-6">
          <span className="text-xs text-white/70">{(selectedIndex + 1).toLocaleString("fa-IR")} از {media.length.toLocaleString("fa-IR")}</span>
          <Modal.CloseTrigger aria-label="بستن گالری" className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/15"><X size={25} /></Modal.CloseTrigger>
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

export function ProductDetailGallery({ productId, media, productName, productCode, hasDiscount = false, discountEndsAt = null, soldPercent = 0, authenticated = false, initialFavorite = false }: ProductDetailGalleryProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? "");
  const [favorite, setFavorite] = useState(initialFavorite);
  const [priceAlert, setPriceAlert] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // `now` is computed at both server-render and client-hydration time, so it differs by
  // however long that gap takes; gating the countdown behind `hydrated` (false during SSR
  // and the client's first hydration pass, true right after) keeps the rendered text
  // identical between the two instead of racing a real timestamp against itself.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const selectedIndex = Math.max(0, media.findIndex((item) => item.id === selectedId));
  const selected = media[selectedIndex] ?? media[0];
  const previewMedia = useMemo(() => media.slice(0, 5), [media]);
  const countdown = hydrated ? formatCountdown(discountEndsAt, now) : null;
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

    const timer = window.setInterval(check, 1000);
    function onVisible() { if (document.visibilityState === "visible") check(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [discountEndsAt, hasDiscount, router]);

  function selectAt(index: number) {
    if (!media.length) return;
    const normalized = (index + media.length) % media.length;
    setSelectedId(media[normalized].id);
  }

  async function shareProduct() {
    const shareData = { title: productName, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      toast.success("لینک محصول آماده اشتراک‌گذاری شد");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.danger("اشتراک‌گذاری انجام نشد");
    }
  }

  async function toggleFavorite() {
    if (!authenticated) { router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
    const next = !favorite;
    const response = await fetch(`/api/account/favorites/${productId}`, { method: next ? "PUT" : "DELETE" });
    if (!response.ok) { toast.danger("تغییر علاقه‌مندی انجام نشد"); return; }
    setFavorite(next);
    toast.success(next ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
  }

  const actions = [
    { label: favorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها", icon: <Heart size={23} className={favorite ? "fill-[var(--danger)] text-[var(--danger)]" : ""} />, onPress: () => void toggleFavorite() },
    { label: "اشتراک‌گذاری محصول", icon: <Share2 size={22} />, onPress: () => void shareProduct() },
    { label: priceAlert ? "غیرفعال‌کردن اطلاع‌رسانی" : "اطلاع‌رسانی تغییرات محصول", icon: <Bell size={22} className={priceAlert ? "fill-[var(--brand-accent)] text-[var(--brand-accent)]" : ""} />, onPress: () => setPriceAlert((value) => !value) },
    { label: "نمودار قیمت", icon: <ChartNoAxesCombined size={22} />, onPress: () => toast.success("نمودار قیمت در مرحله اتصال API فعال می‌شود") },
    { label: "مقایسه محصول", icon: <Scale size={21} />, onPress: () => toast.success("مقایسه محصول در مرحله اتصال API فعال می‌شود") },
    { label: "مشخصات محصول", icon: <List size={22} />, onPress: () => document.getElementById("specifications")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  return <section className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1" aria-label="گالری محصول">
    {hasDiscount && countdown && <div className="mb-5 flex min-h-12 items-center gap-3 px-3 text-[11px] font-bold text-[var(--danger)] sm:gap-4 sm:px-5 sm:text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, white)" }}><span className="shrink-0">پیشنهاد شگفت‌انگیز</span>{showSoldProgress && <div className="flex min-w-0 flex-1 items-center gap-2 text-slate-500"><span className="shrink-0 font-medium"><strong className="text-[var(--danger)]">{normalizedSoldPercent.toLocaleString("fa-IR")}٪</strong> فروش رفته</span><ProgressBar value={normalizedSoldPercent} aria-label="درصد فروش محصول" dir="ltr" className="min-w-8 flex-1"><ProgressBar.Track className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--danger) 18%, white)" }}><ProgressBar.Fill className="h-full rounded-full bg-[var(--danger)]" /></ProgressBar.Track></ProgressBar></div>}<span dir="ltr" className={`${showSoldProgress ? "" : "mr-auto"} flex shrink-0 items-center gap-2 whitespace-nowrap tabular-nums`}>{countdown.days > 0 && <span dir="rtl" className="inline-flex h-7 items-center rounded-md border bg-white/70 px-2 text-[10px] font-bold text-[var(--danger)] sm:text-[11px]" style={{ borderColor: "color-mix(in srgb, var(--danger) 28%, white)" }}>{countdown.days.toLocaleString("fa-IR")} روز</span>}<bdi dir="ltr">{countdown.clock}</bdi></span></div>}

    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex shrink-0 flex-row gap-1 sm:w-10 sm:flex-col" aria-label="عملیات محصول">
        {actions.map((action) => <Button key={action.label} type="button" isIconOnly variant="ghost" size="sm" aria-label={action.label} onPress={action.onPress} className="size-10 min-h-10 min-w-10 rounded-full text-slate-700 hover:bg-[var(--surface-tertiary)] hover:text-[var(--brand-primary)]">{action.icon}</Button>)}
      </div>
      <div className="relative grid aspect-square min-w-0 flex-1 place-items-center overflow-hidden bg-white">
        <GalleryMedia item={selected} productName={productName} priority />
      </div>
    </div>

    {media.length > 1 && <div className="mt-4 flex items-stretch justify-center gap-2 overflow-x-auto pb-1" role="group" aria-label="انتخاب تصویر محصول">
      {previewMedia.map((item) => <Button key={item.id} type="button" isIconOnly variant="secondary" aria-label={`نمایش ${item.alt || productName}`} aria-pressed={item.id === selected?.id} onPress={() => setSelectedId(item.id)} className={`relative size-[74px] min-h-[74px] min-w-[74px] overflow-hidden rounded-lg border bg-white p-0 ${item.id === selected?.id ? "border-[var(--brand-accent)]" : "border-slate-200 hover:border-[var(--brand-accent)]"}`}>
        {item.type === "IMAGE" ? <Image src={item.url} alt={item.alt || productName} fill sizes="74px" className="object-contain p-1.5" /> : <><video src={item.url} muted className="h-full w-full object-cover" aria-hidden="true" /><span className="absolute inset-0 grid place-items-center bg-black/20 text-white"><Play size={20} fill="currentColor" /></span></>}
      </Button>)}
      <Modal>
        <Button type="button" isIconOnly variant="secondary" aria-label="مشاهده همه تصاویر" className="relative size-[74px] min-h-[74px] min-w-[74px] cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0 outline-none hover:border-[var(--brand-accent)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">
          {media[media.length - 1]?.type === "IMAGE" && <Image src={media[media.length - 1].url} alt="" fill sizes="74px" className="scale-110 object-cover blur-[5px]" />}
          <span className="absolute inset-0 grid place-items-center bg-white/45 text-slate-700"><Ellipsis size={28} /></span>
        </Button>
        {renderFullscreenGallery({ media, selected, selectedIndex, productName, onSelect: setSelectedId, onStep: selectAt })}
      </Modal>
    </div>}
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-1 text-[11px] text-slate-400"><span className="inline-flex items-center gap-1.5"><Info size={15} />گزارش مشخصات کالا یا موارد قانونی</span><span dir="ltr">{productCode}</span></div>

  </section>;
}
