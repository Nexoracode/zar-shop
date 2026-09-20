"use client";
import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import { Check, FileText, Minus, PackageCheck, Plus, Ruler, ShieldCheck, ShoppingCart, Store, Trash2, Truck, Warehouse, X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { listenForCartUpdates, notifyCartUpdated } from "@/components/storefront-cart-link";
import { FlashSaleCountdown, useRemainingMs } from "@/components/flash-sale-countdown";

type OptionGuide = { url: string; type: "IMAGE" | "DOCUMENT"; title: string };
type ProductOption = { id: string; name: string; kind: "COLOR" | "SELECT"; values: Array<{ value: string; stock: number; color: { name: string; hex: string } | null }> };

/** One buyable combination. `selection` is keyed by type name, the same key `options[].id` carries. */
type PurchasableVariant = { selection: Record<string, string>; price: number | null; originalPrice: number | null; /** When the discount running on this variant ends; null when it has none or is a فروش ویژه without a window. */ discountEndsAt: string | null; stock: number; preparationDays: number; available: boolean };

/** A cart line this page added, keyed by the picked combination — each combination is its own line. */
type CartLine = { id: string; quantity: number };
type CartLines = Record<string, CartLine>;

type PurchaseState = {
  /** Every variant with its stock, so anything on the page can speak for the one picked. */
  variants: Array<{ id: string; selection: Record<string, string>; stock: number }>;
  selectedOptions: Record<string, string>;
  setSelectedOptions: Dispatch<SetStateAction<Record<string, string>>>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  cartLines: CartLines;
  setCartLines: Dispatch<SetStateAction<CartLines>>;
};

const ProductPurchaseContext = createContext<PurchaseState | null>(null);

/** Marks the cart events this page raises itself, which it must not treat as a change made elsewhere. */
const PURCHASE_ORIGIN = "product-purchase";

export function ProductPurchaseProvider({ children, productId, variantIds = [], initialSelectedOptions = {}, initialCartLines = [] }: { children: ReactNode; /** Every variant of the product, so the address can name the one picked (`?variant=<id>`). */ variantIds?: Array<{ id: string; selection: Record<string, string>; stock: number }>; /** Lets a line added in another tab be placed here when this page shows the same product. */ productId?: string; initialSelectedOptions?: Record<string, string>; /** Lines the visitor already had in the cart when the page rendered. */ initialCartLines?: Array<CartLine & { selection: Record<string, string> }> }) {
  const [selectedOptions, setSelectedOptions] = useState(initialSelectedOptions);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const serverCartLines: CartLines = Object.fromEntries(initialCartLines.map((line) => [cartLineKey(line.selection), { id: line.id, quantity: line.quantity }]));
  const [cartLines, setCartLines] = useState<CartLines>(serverCartLines);
  // This page stays mounted (hidden) while the visitor is elsewhere, and its listeners are off then — so a
  // change made in the cart page never reaches `cartLines`. Coming back re-renders it with fresh server data;
  // adopting that keeps the card from showing the quantity the visitor left. A payload that lands while a
  // request of ours is running is stale by definition and is dropped.
  const serverSignature = JSON.stringify(Object.entries(serverCartLines).sort(([a], [b]) => a.localeCompare(b)));
  const [syncedSignature, setSyncedSignature] = useState(serverSignature);
  if (serverSignature !== syncedSignature) {
    setSyncedSignature(serverSignature);
    if (!loading) setCartLines(serverCartLines);
  }

  // A line changed somewhere else — the header's cart preview, or any other tab — is followed here too,
  // so this card never keeps claiming a quantity the cart no longer holds.
  useEffect(() => listenForCartUpdates((detail) => {
    const change = detail.change;
    if (!change || detail.origin === PURCHASE_ORIGIN) return;
    setCartLines((current) => {
      const known = Object.entries(current).find(([, line]) => line.id === change.itemId);
      if (change.quantity === null) {
        if (!known) return current;
        const next = { ...current };
        delete next[known[0]];
        return next;
      }
      // A line this tab has not seen yet can only be placed when the change says which combination it is.
      const key = known?.[0] ?? (change.productId === productId && change.selection ? cartLineKey(change.selection) : null);
      return key === null ? current : { ...current, [key]: { id: change.itemId, quantity: change.quantity } };
    });
  }), [productId]);

  // The address follows the choice, the way a marketplace's does: copy it and the same variant opens.
  // Nothing to name for a product with a single (default) variant.
  useEffect(() => {
    if (variantIds.length < 2) return;
    const chosen = cartLineKey(selectedOptions);
    const match = variantIds.find((variant) => cartLineKey(variant.selection) === chosen);
    const url = new URL(window.location.href);
    if (match) url.searchParams.set("variant", match.id);
    else url.searchParams.delete("variant");
    window.history.replaceState(window.history.state, "", url);
  }, [selectedOptions, variantIds]);

  return <ProductPurchaseContext.Provider value={{ variants: variantIds, selectedOptions, setSelectedOptions, message, setMessage, loading, setLoading, cartLines, setCartLines }}>{children}</ProductPurchaseContext.Provider>;
}

/**
 * How many of the picked variant are in stock. It reads the choice from the page's shared state, so
 * it follows the colour or size the visitor picks — a product's total says nothing about one variant.
 */
export function VariantStockLabel({ showStock, lowStockThreshold }: { showStock: boolean; lowStockThreshold: number }) {
  const state = useContext(ProductPurchaseContext);
  const chosen = cartLineKey(state?.selectedOptions ?? {});
  const variant = state?.variants.find((item) => cartLineKey(item.selection) === chosen);
  if (!variant) return <span className="text-xs font-bold text-[var(--danger)]">این ترکیب موجود نیست</span>;
  const low = variant.stock > 0 && variant.stock <= lowStockThreshold;
  const label = variant.stock < 1
    ? "در حال حاضر ناموجود"
    : !showStock
      ? "موجود در انبار"
      : low
        ? `🔥 تنها ${variant.stock.toLocaleString("fa-IR")} عدد در انبار باقی مانده`
        : `${variant.stock.toLocaleString("fa-IR")} عدد موجود در انبار`;
  return <span className={`text-xs font-bold ${variant.stock < 1 || low ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{label}</span>;
}

/** The detailed purchase card's header while a time-limited discount runs: "پیشنهاد شگفت‌انگیز" and the time left. */
function FlashOfferHeader({ endsAt }: { endsAt: string }) {
  const remaining = useRemainingMs(endsAt);
  // Once the time is up the offer is over; the header goes until the page refreshes the price.
  if (remaining !== null && remaining <= 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <strong className="text-[15px] font-black text-[var(--danger)]">پیشنهاد شگفت‌انگیز</strong>
      <FlashSaleCountdown endsAt={endsAt} tone="plain" />
    </div>
  );
}

function cartLineKey(selectedOptions: Record<string, string>) {
  return JSON.stringify(Object.entries(selectedOptions).sort(([a], [b]) => a.localeCompare(b)));
}

/** The combination currently picked, shared with every `AddToCart` instance on the page — so a
 * sibling like the gallery badge can react to a choice made in a different one. */
export function useSelectedProductOptions(): Record<string, string> {
  return useContext(ProductPurchaseContext)?.selectedOptions ?? {};
}

export function AddToCart({ productId, options = [], variants = [], optionGuide, disabled, disabledLabel = "ناموجود", currency = "IRR", layout = "default", purchaseSummary, purchaseMeta, purchaseFooter, purchasePrice = null, purchaseOriginalPrice = null, preparationDays = 0, showOptionFields = true, showPurchaseCard = true, showMobileBar = false, purchaseCardClassName, purchaseCardStickyTop = "6rem", detailedCard }: { productId: string; options?: ProductOption[]; variants?: PurchasableVariant[]; optionGuide?: OptionGuide | null; disabled: boolean; disabledLabel?: string; currency?: "IRR" | "IRT"; layout?: "default" | "product-detail"; purchaseSummary?: ReactNode; purchaseMeta?: ReactNode; /** Rendered under the trust badges, once per card instance — e.g. a "chat with support" link. */ purchaseFooter?: ReactNode; purchasePrice?: number | null; purchaseOriginalPrice?: number | null; preparationDays?: number; showOptionFields?: boolean; showPurchaseCard?: boolean; /** Renders the persistent mobile bottom price+buy bar — set on exactly one of the page's `AddToCart` instances. */ showMobileBar?: boolean; purchaseCardClassName?: string; purchaseCardStickyTop?: string; /** Turns the purchase card into the marketplace-style one: the product itself, the choices made, who sells it, stock, the price and — while a time-limited discount runs — the "پیشنهاد شگفت‌انگیز" header. Only the page's second card asks for it. */ detailedCard?: { name: string; imageUrl: string | null; imageAlt: string; storeName: string } }) {
  const router = useRouter();
  const sharedState = useContext(ProductPurchaseContext);
  const [localMessage, setLocalMessage] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [localSelectedOptions, setLocalSelectedOptions] = useState<Record<string, string>>(() => Object.fromEntries(options.flatMap((option) => {
    const firstAvailable = option.values.find((item) => item.stock > 0);
    return firstAvailable ? [[option.id, firstAvailable.value]] : [];
  })));
  const msg = sharedState?.message ?? localMessage;
  const setMsg = sharedState?.setMessage ?? setLocalMessage;
  const loading = sharedState?.loading ?? localLoading;
  const setLoading = sharedState?.setLoading ?? setLocalLoading;
  const selectedOptions = sharedState?.selectedOptions ?? localSelectedOptions;
  const setSelectedOptions = sharedState?.setSelectedOptions ?? setLocalSelectedOptions;
  const [guideOpen, setGuideOpen] = useState(false);
  const [localCartLines, setLocalCartLines] = useState<CartLines>({});
  const [pendingAction, setPendingAction] = useState<"increase" | "decrease" | null>(null);
  const cartLines = sharedState?.cartLines ?? localCartLines;
  const setCartLines = sharedState?.setCartLines ?? setLocalCartLines;
  const lineKey = cartLineKey(selectedOptions);
  const cartLine = cartLines[lineKey] ?? null;
  /*
   * The combination the current choices name. Price and stock belong to the pairing, not to a
   * value — black is neither cheap nor plentiful on its own, only black in a given size is.
   */
  const selectedVariant = variants.find((variant) => options.every((option) => variant.selection[option.id] === selectedOptions[option.id])) ?? null;
  // Out of stock as a pairing counts too: black and XL can each be in stock somewhere and still not together.
  const optionStockUnavailable = options.length > 0 && (!variants.some((variant) => variant.available) || (selectedVariant !== null && !selectedVariant.available));
  const flashEndsAt = detailedCard ? selectedVariant?.discountEndsAt ?? null : null;
  // What the visitor has picked, one line each — a colour with its swatch, anything else as «سایز: XL».
  const chosenDetails = options.flatMap((option) => {
    const value = selectedOptions[option.id];
    if (!value) return [];
    const item = option.values.find((entry) => entry.value === value);
    return [{ key: option.id, label: option.name, text: item?.color?.name ?? value, hex: item?.color?.hex ?? null }];
  });
  // The amount and its unit apart, so the unit can sit small beside a large number.
  const moneyParts = (value: number) => {
    const text = formatMoney(value, currency);
    const cut = text.lastIndexOf(" ");
    return { amount: text.slice(0, cut), unit: text.slice(cut + 1) };
  };
  const displayedPrice = selectedVariant?.price ?? purchasePrice;
  const displayedOriginalPrice = selectedVariant?.originalPrice ?? purchaseOriginalPrice;
  // Worked out from whichever price ended up on screen, not passed in as its own prop — a
  // combination can carry a different discount than the product, so a static percentage would
  // drift the moment the picked combination changed.
  const discountLabel = displayedOriginalPrice !== null && displayedPrice !== null && displayedOriginalPrice > displayedPrice
    ? `${Math.round(((displayedOriginalPrice - displayedPrice) / displayedOriginalPrice) * 100).toLocaleString("fa-IR")}٪`
    : null;

  async function add() {
    const missingOption = options.find((option) => !selectedOptions[option.id]);
    if (missingOption) {
      toast.danger("انتخاب تنوع محصول کامل نیست", { description: `لطفاً برای «${missingOption.name}» یکی از مقادیر موجود را انتخاب کنید.`, timeout: 4500 });
      return;
    }
    const key = lineKey;
    setLoading(true);
    setPendingAction("increase");
    setMsg("");
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1, selectedOptions }),
    });
    const data = await r.json();
    setLoading(false);
    setPendingAction(null);
    if (r.status === 401) { router.push("/login?next=/cart"); return; }
    setMsg(data.message ?? "");
    if (r.ok) {
      if (typeof data.itemCount === "number") notifyCartUpdated(data.itemCount, PURCHASE_ORIGIN, typeof data.cartItemId === "string" && typeof data.quantity === "number" ? { itemId: data.cartItemId, quantity: data.quantity, productId, selection: selectedOptions } : undefined);
      if (typeof data.quantity === "number" && typeof data.cartItemId === "string") setCartLines((current) => ({ ...current, [key]: { id: data.cartItemId, quantity: data.quantity } }));
      router.refresh();
    }
  }

  /** Steps the line down by one, or removes it at one. A plain decrement shows at once and rolls back on
   * failure; removal waits for the server so the card never claims the item is gone while it is still there. */
  async function decrease() {
    if (!cartLine) return;
    const key = lineKey;
    const line = cartLine;
    const removing = line.quantity <= 1;
    setLoading(true);
    setPendingAction("decrease");
    setMsg("");
    if (!removing) setCartLines((current) => ({ ...current, [key]: { ...line, quantity: line.quantity - 1 } }));
    try {
      const response = await fetch(removing ? `/api/cart?itemId=${encodeURIComponent(line.id)}` : "/api/cart", {
        method: removing ? "DELETE" : "PATCH",
        headers: removing ? undefined : { "Content-Type": "application/json" },
        body: removing ? undefined : JSON.stringify({ cartItemId: line.id, quantity: line.quantity - 1 }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "به‌روزرسانی سبد خرید انجام نشد.");
      if (removing) setCartLines((current) => { const next = { ...current }; delete next[key]; return next; });
      notifyCartUpdated(result.itemCount ?? 0, PURCHASE_ORIGIN, { itemId: line.id, quantity: removing ? null : line.quantity - 1 });
      router.refresh();
    } catch (error) {
      setCartLines((current) => ({ ...current, [key]: line }));
      toast.danger("سبد خرید به‌روزرسانی نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }

  const optionFields = options.length > 0 ? <div className="grid gap-4">
        {optionGuide && <div className="flex justify-end"><Button type="button" variant="ghost" onPress={() => setGuideOpen(true)} className="h-auto min-h-0 gap-1 p-0 text-xs font-bold text-[var(--brand-accent)]"><Ruler size={15} />راهنمای انتخاب</Button></div>}
        {options.map((option) => {
          const selectedValue = option.values.find((item) => selectedOptions[option.id] === item.value);
          return <div key={option.id} className="grid gap-3">{option.kind === "COLOR" ? <><span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">{selectedValue?.color && <span className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: selectedValue.color.hex }} />}رنگ: <strong className="text-slate-900">{selectedValue?.color?.name ?? selectedValue?.value ?? "انتخاب کنید"}</strong></span><div className="flex flex-wrap gap-4 px-1 py-1" role="group" aria-label={`انتخاب ${option.name}`}>{option.values.map((item) => { const selected = selectedOptions[option.id] === item.value; const unavailable = item.stock < 1; return <Button key={item.value} type="button" isIconOnly variant="secondary" isDisabled={unavailable} aria-pressed={selected} aria-label={`${item.value}${item.color ? `، رنگ ${item.color.name}` : ""}${unavailable ? "، ناموجود" : selected ? "، انتخاب‌شده" : ""}`} onPress={() => setSelectedOptions((current) => ({ ...current, [option.id]: item.value }))} className={`relative size-11 min-h-11 min-w-11 rounded-full border bg-white p-1 transition ${unavailable ? "border-slate-200 opacity-45" : selected ? "border-[var(--brand-accent)]" : "border-slate-300 hover:border-[var(--brand-accent)]"}`} style={selected ? { boxShadow: "0 0 0 3px white, 0 0 0 5px var(--brand-accent)" } : undefined}><span className="block size-full rounded-full border border-black/10" style={{ backgroundColor: item.color?.hex ?? "var(--separator)" }} />{selected && <span className="absolute inset-0 grid place-items-center text-lg font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">✓</span>}{unavailable && <span className="absolute inset-1 rotate-45 border-l border-slate-500" />}</Button>; })}</div></> : <><span className="text-xs font-bold text-slate-600">{option.name}</span><div className="flex flex-wrap gap-2" role="group" aria-label={`انتخاب ${option.name}`}>{option.values.map((item) => { const selected = selectedOptions[option.id] === item.value; const unavailable = item.stock < 1; return <Button key={item.value} type="button" variant="secondary" isDisabled={unavailable} aria-pressed={selected} aria-label={`${item.value}${unavailable ? "، ناموجود" : selected ? "، انتخاب‌شده" : ""}`} onPress={() => setSelectedOptions((current) => ({ ...current, [option.id]: item.value }))} className={`min-h-10 min-w-12 rounded-lg border px-3 text-sm font-bold transition ${unavailable ? "border-slate-200 bg-slate-100 text-slate-400 line-through" : selected ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] ring-2 ring-[var(--brand-accent)]/25" : "border-[var(--border)] bg-white text-[var(--brand-primary)] hover:border-[var(--brand-accent)]"}`}>{item.value}{unavailable && <small className="mr-1 text-[10px]">ناموجود</small>}</Button>; })}</div></>}</div>;
        })}
      </div> : null;
  const primaryAddButton = <Button
        onPress={() => void add()}
        isDisabled={disabled || optionStockUnavailable}
        isPending={loading}
        fullWidth
        variant="primary"
        className="w-full min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center gap-[9px] border border-[var(--brand-primary)] rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] transition-all duration-200 hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--brand-primary)_18%,transparent)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{disabled ? disabledLabel : optionStockUnavailable ? "تنوع موجودی ندارد" : isPending ? "در حال افزودن..." : "افزودن به سبد"}</>}
      </Button>;
  const addButton = cartLine ? <div className="grid gap-2"><div className="flex min-h-12 items-center overflow-hidden rounded-lg border border-[var(--brand-primary)] bg-[var(--surface)]"><Button type="button" isIconOnly variant="ghost" isPending={loading && pendingAction === "increase"} isDisabled={loading} aria-label="افزودن یک عدد دیگر" onPress={() => void add()} className="size-11 min-h-11 min-w-11 text-[var(--brand-primary)]"><Plus size={17} /></Button><span className="grid min-w-9 place-items-center text-sm font-bold text-[var(--brand-primary)]">{cartLine.quantity.toLocaleString("fa-IR")}</span><Button type="button" isIconOnly variant="ghost" isPending={loading && pendingAction === "decrease"} isDisabled={loading} aria-label={cartLine.quantity <= 1 ? "حذف از سبد خرید" : "کاهش یک عدد"} onPress={() => void decrease()} className="size-11 min-h-11 min-w-11 text-[var(--brand-primary)]">{cartLine.quantity <= 1 ? <Trash2 size={17} /> : <Minus size={17} />}</Button><span className="mr-auto ml-3 flex items-center gap-1 whitespace-nowrap text-xs font-bold text-[var(--success)]"><Check size={15} />در سبد شما</span></div><Link href="/cart" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-bold text-[var(--brand-primary-foreground)]"><ShoppingCart size={17} />مشاهده سبد خرید</Link></div> : primaryAddButton;
  const guideModal = optionGuide && <Modal.Backdrop isOpen={guideOpen} onOpenChange={setGuideOpen} variant="blur"><Modal.Container size="lg" placement="center"><Modal.Dialog aria-label="راهنمای انتخاب محصول" dir="rtl" className="mx-3 text-right max-h-[calc(100dvh-32px)] overflow-hidden bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4"><div><Modal.Heading className="text-base font-bold text-slate-900">راهنمای انتخاب</Modal.Heading><p className="mt-1 text-xs text-slate-500">{optionGuide.title}</p></div><Modal.CloseTrigger aria-label="بستن راهنمای انتخاب" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="min-h-64 bg-slate-50 p-3 sm:p-5">{optionGuide.type === "IMAGE" ? <div className="relative min-h-[55vh] w-full overflow-hidden rounded-xl bg-white"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="90vw" className="object-contain" /></div> : <div className="grid gap-3"><iframe src={optionGuide.url} title={optionGuide.title} className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white" /><a href={optionGuide.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--brand-accent)]/40 bg-white text-sm font-bold text-[var(--brand-accent)] transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)]"><FileText size={16} />باز کردن فایل PDF در صفحه جدید</a></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>;

  if (layout === "product-detail") return <>
    {showOptionFields && optionFields && <section className="grid gap-4 pt-7 lg:col-start-2 lg:row-start-2" aria-label="انتخاب تنوع محصول">{optionFields}</section>}
    {showPurchaseCard && detailedCard && <aside className={`hidden lg:block ${purchaseCardClassName ?? ""}`}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:sticky" style={{ top: purchaseCardStickyTop }}>
        {flashEndsAt && <FlashOfferHeader endsAt={flashEndsAt} />}
        <div className="grid gap-4 p-4">
          <div className="flex items-start gap-3">
            <span className="relative grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
              {detailedCard.imageUrl ? <Image src={detailedCard.imageUrl} alt={detailedCard.imageAlt} fill sizes="76px" className="object-contain p-1" /> : <PackageCheck size={24} aria-hidden />}
            </span>
            <div className="grid min-w-0 flex-1 gap-2">
              <h3 className="m-0 line-clamp-2 text-[13px] font-bold leading-6 text-slate-900">{detailedCard.name}</h3>
              {chosenDetails.map((detail) => (
                <span key={detail.key} className="flex min-w-0 items-center gap-2 text-[12px] text-slate-600">
                  {detail.hex ? <span aria-hidden className="size-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: detail.hex }} /> : <span className="shrink-0 text-slate-400">{detail.label}:</span>}
                  <span className="truncate">{detail.text}</span>
                </span>
              ))}
            </div>
          </div>

          <ul className="m-0 grid list-none gap-3 border-t border-slate-200 p-0 pt-4 text-[13px] text-slate-700">
            <li className="flex items-center gap-2.5">
              <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]"><Store size={13} /></span>
              <span className="min-w-0 truncate font-bold">{detailedCard.storeName}</span>
            </li>
            <li className="flex items-center gap-2.5"><ShieldCheck size={18} className="shrink-0 text-slate-500" aria-hidden /><span>ضمانت اصالت و سلامت کالا</span></li>
            <li className="flex items-center gap-2.5"><Warehouse size={18} className="shrink-0 text-slate-500" aria-hidden />{purchaseMeta}</li>
            <li className="flex items-center gap-2.5"><Truck size={18} className="shrink-0 text-slate-500" aria-hidden /><span>{(selectedVariant?.preparationDays ?? preparationDays) > 0 ? `آماده‌سازی و ارسال تا ${(selectedVariant?.preparationDays ?? preparationDays).toLocaleString("fa-IR")} روز کاری` : "ارسال قابل پیگیری"}</span></li>
          </ul>

          <div className="grid gap-1.5">
            {displayedOriginalPrice !== null && displayedPrice !== null && displayedOriginalPrice > displayedPrice && (
              <div className="flex items-center gap-2">
                {discountLabel && <span className="inline-flex items-center rounded-full bg-[var(--danger)] px-2 py-1 text-[11px] font-bold leading-none text-[var(--danger-foreground)]">{discountLabel}</span>}
                <span className="text-[13px] text-slate-400 line-through">{moneyParts(displayedOriginalPrice).amount}</span>
              </div>
            )}
            {displayedPrice === null
              ? <strong className="text-base font-bold text-slate-900">قیمت نامشخص</strong>
              : <div className="flex items-baseline gap-1.5"><strong className="text-[26px] font-black leading-none text-slate-900">{moneyParts(displayedPrice).amount}</strong><span className="text-[12px] text-slate-500">{moneyParts(displayedPrice).unit}</span></div>}
          </div>
          {purchaseSummary}
          {addButton}
          {msg && <small className="block text-[var(--brand-accent)]">{msg}</small>}
          {purchaseFooter}
        </div>
      </div>
    </aside>}
    {showPurchaseCard && !detailedCard && <aside className={`hidden lg:block ${purchaseCardClassName ?? "lg:col-start-3 lg:row-span-2 lg:row-start-1"}`}>
      <div className="grid gap-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 lg:sticky" style={{ top: purchaseCardStickyTop }}>
        <strong className="text-base font-bold text-slate-900">خرید این محصول</strong>
        {purchaseSummary}
        {displayedOriginalPrice !== null && displayedPrice !== null && displayedOriginalPrice > displayedPrice && <div className="flex items-center gap-2"><span className="text-xs text-slate-400 line-through">{formatMoney(displayedOriginalPrice, currency)}</span>{discountLabel && <span className="inline-flex items-center rounded-full bg-[var(--danger)] px-2 py-1 text-[10px] font-bold text-[var(--danger-foreground)]">{discountLabel}</span>}</div>}
        <strong className="text-left text-xl font-bold text-slate-900" dir="rtl">{displayedPrice === null ? "قیمت نامشخص" : formatMoney(displayedPrice, currency)}</strong>
        {purchaseMeta}
        {addButton}
        {msg && <small className="block text-[var(--brand-accent)]">{msg}</small>}
        <div className="grid gap-3 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <span className="flex items-center justify-between gap-3"><span>ضمانت اصالت و سلامت کالا</span><ShieldCheck size={18} className="text-slate-500" /></span>
          <span className="flex items-center justify-between gap-3"><span>{(selectedVariant?.preparationDays ?? preparationDays) > 0 ? `آماده‌سازی و ارسال تا ${(selectedVariant?.preparationDays ?? preparationDays).toLocaleString("fa-IR")} روز کاری` : "ارسال قابل پیگیری"}</span><PackageCheck size={18} className="text-slate-500" /></span>
        </div>
        {purchaseFooter}
      </div>
    </aside>}
    {showOptionFields && guideModal}
    {showMobileBar && <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,.06)] lg:hidden">
      <div className="min-w-0 shrink-0">
        {displayedOriginalPrice !== null && displayedPrice !== null && displayedOriginalPrice > displayedPrice && <div className="flex items-center gap-1.5"><span className="text-[10px] text-slate-400 line-through">{formatMoney(displayedOriginalPrice, currency)}</span>{discountLabel && <span className="inline-flex items-center rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--danger-foreground)]">{discountLabel}</span>}</div>}
        <strong className="block truncate text-sm font-bold text-slate-900">{displayedPrice === null ? "قیمت نامشخص" : formatMoney(displayedPrice, currency)}</strong>
      </div>
      <div className="flex-1">{addButton}</div>
    </div>}
  </>;

  return <div className="grid gap-3">
    {optionFields}
    {addButton}
    {msg && <small className="block mt-2 text-[var(--brand-accent)]">{msg}</small>}
    {guideModal}
  </div>;
}
