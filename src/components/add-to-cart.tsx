"use client";
import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import { Check, FileText, PackageCheck, Plus, Ruler, ShieldCheck, ShoppingCart, X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { notifyCartUpdated } from "@/components/storefront-cart-link";

type OptionGuide = { url: string; type: "IMAGE" | "DOCUMENT"; title: string };
type ProductOption = { id: string; name: string; kind: "COLOR" | "SELECT"; values: Array<{ value: string; stock: number; color: { name: string; hex: string } | null }> };

/** One buyable combination. `selection` is keyed by type name, the same key `options[].id` carries. */
type PurchasableVariant = { selection: Record<string, string>; price: number | null; originalPrice: number | null; stock: number; available: boolean };

type PurchaseState = {
  selectedOptions: Record<string, string>;
  setSelectedOptions: Dispatch<SetStateAction<Record<string, string>>>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

const ProductPurchaseContext = createContext<PurchaseState | null>(null);

export function ProductPurchaseProvider({ children, initialSelectedOptions = {} }: { children: ReactNode; initialSelectedOptions?: Record<string, string> }) {
  const [selectedOptions, setSelectedOptions] = useState(initialSelectedOptions);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  return <ProductPurchaseContext.Provider value={{ selectedOptions, setSelectedOptions, message, setMessage, loading, setLoading }}>{children}</ProductPurchaseContext.Provider>;
}

/** The combination currently picked, shared with every `AddToCart` instance on the page — so a
 * sibling like the gallery badge can react to a choice made in a different one. */
export function useSelectedProductOptions(): Record<string, string> {
  return useContext(ProductPurchaseContext)?.selectedOptions ?? {};
}

export function AddToCart({ productId, options = [], variants = [], optionGuide, disabled, disabledLabel = "ناموجود", currency = "IRR", layout = "default", purchaseSummary, purchaseMeta, purchasePrice = null, purchaseOriginalPrice = null, preparationDays = 0, showOptionFields = true, showPurchaseCard = true, purchaseCardClassName, purchaseCardStickyTop = "6rem" }: { productId: string; options?: ProductOption[]; variants?: PurchasableVariant[]; optionGuide?: OptionGuide | null; disabled: boolean; disabledLabel?: string; currency?: "IRR" | "IRT"; layout?: "default" | "product-detail"; purchaseSummary?: ReactNode; purchaseMeta?: ReactNode; purchasePrice?: number | null; purchaseOriginalPrice?: number | null; preparationDays?: number; showOptionFields?: boolean; showPurchaseCard?: boolean; purchaseCardClassName?: string; purchaseCardStickyTop?: string }) {
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
  const [addedQuantity, setAddedQuantity] = useState(0);
  /*
   * The combination the current choices name. Price and stock belong to the pairing, not to a
   * value — black is neither cheap nor plentiful on its own, only black in a given size is.
   */
  const selectedVariant = variants.find((variant) => options.every((option) => variant.selection[option.id] === selectedOptions[option.id])) ?? null;
  const optionStockUnavailable = options.length > 0 && !variants.some((variant) => variant.available);
  const selectedColorValue = options.filter((option) => option.kind === "COLOR").flatMap((option) => option.values.filter((item) => selectedOptions[option.id] === item.value)).find((item) => item.color);
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
    setLoading(true);
    setMsg("");
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1, selectedOptions }),
    });
    const data = await r.json();
    setLoading(false);
    if (r.status === 401) { router.push("/login?next=/cart"); return; }
    setMsg(data.message ?? "");
    if (r.ok) {
      if (typeof data.itemCount === "number") notifyCartUpdated(data.itemCount);
      if (typeof data.quantity === "number") setAddedQuantity(data.quantity);
      router.refresh();
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
        className="w-full min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center gap-[9px] border border-[var(--brand-primary)] rounded-sm bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] transition-all duration-200 hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--brand-primary)_18%,transparent)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{disabled ? disabledLabel : optionStockUnavailable ? "تنوع موجودی ندارد" : isPending ? "در حال افزودن..." : "افزودن به سبد"}</>}
      </Button>;
  const addButton = addedQuantity > 0 ? <div className="grid gap-2"><div className="flex min-h-12 items-center overflow-hidden rounded-lg border border-[var(--brand-primary)] bg-[var(--surface)]"><Button type="button" isIconOnly variant="ghost" isPending={loading} aria-label="افزودن یک عدد دیگر" onPress={() => void add()} className="size-11 min-h-11 min-w-11 text-[var(--brand-primary)]"><Plus size={17} /></Button><span className="grid min-w-9 flex-1 place-items-center text-sm font-bold text-[var(--brand-primary)]">{addedQuantity.toLocaleString("fa-IR")}</span><span className="ml-3 flex items-center gap-1 text-xs font-bold text-emerald-700"><Check size={15} />در سبد شما</span></div><Link href="/cart" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-bold text-[var(--brand-primary-foreground)]"><ShoppingCart size={17} />مشاهده سبد خرید</Link></div> : primaryAddButton;
  const guideModal = optionGuide && <Modal.Backdrop isOpen={guideOpen} onOpenChange={setGuideOpen} variant="blur"><Modal.Container size="lg" placement="center"><Modal.Dialog aria-label="راهنمای انتخاب محصول" dir="rtl" className="mx-3 text-right max-h-[calc(100dvh-32px)] overflow-hidden bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4"><div><Modal.Heading className="text-base font-bold text-slate-900">راهنمای انتخاب</Modal.Heading><p className="mt-1 text-xs text-slate-500">{optionGuide.title}</p></div><Modal.CloseTrigger aria-label="بستن راهنمای انتخاب" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="min-h-64 bg-slate-50 p-3 sm:p-5">{optionGuide.type === "IMAGE" ? <div className="relative min-h-[55vh] w-full overflow-hidden rounded-xl bg-white"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="90vw" className="object-contain" /></div> : <div className="grid gap-3"><iframe src={optionGuide.url} title={optionGuide.title} className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white" /><a href={optionGuide.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--brand-accent)]/40 bg-white text-sm font-bold text-[var(--brand-accent)] transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)]"><FileText size={16} />باز کردن فایل PDF در صفحه جدید</a></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>;

  if (layout === "product-detail") return <>
    {showOptionFields && optionFields && <section className="grid gap-4 pt-7 lg:col-start-2 lg:row-start-2" aria-label="انتخاب تنوع محصول">{optionFields}</section>}
    {showPurchaseCard && <aside className={purchaseCardClassName ?? "lg:col-start-3 lg:row-span-2 lg:row-start-1"}>
      <div className="grid gap-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 lg:sticky" style={{ top: purchaseCardStickyTop }}>
        <strong className="text-base font-bold text-slate-900">خرید این محصول</strong>
        {purchaseSummary}
        {displayedOriginalPrice !== null && displayedPrice !== null && displayedOriginalPrice > displayedPrice && <div className="flex items-center gap-2"><span className="text-xs text-slate-400 line-through">{formatMoney(displayedOriginalPrice, currency)}</span>{discountLabel && <span className="inline-flex items-center rounded-full bg-[var(--danger)] px-2 py-1 text-[10px] font-bold text-[var(--danger-foreground)]">{discountLabel}</span>}</div>}
        <strong className="text-left text-xl font-bold text-slate-900" dir="rtl">{displayedPrice === null ? "قیمت نامشخص" : formatMoney(displayedPrice, currency)}</strong>
        {selectedColorValue?.color && <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><span className="text-slate-500">رنگ انتخاب‌شده</span><strong className="inline-flex items-center gap-2 text-slate-800"><span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: selectedColorValue.color.hex }} />{selectedColorValue.color.name}</strong></div>}
        {purchaseMeta}
        {addButton}
        {msg && <small className="block text-[var(--brand-accent)]">{msg}</small>}
        <div className="grid gap-3 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <span className="flex items-center justify-between gap-3"><span>ضمانت اصالت و سلامت کالا</span><ShieldCheck size={18} className="text-slate-500" /></span>
          <span className="flex items-center justify-between gap-3"><span>{preparationDays > 0 ? `آماده‌سازی و ارسال تا ${preparationDays.toLocaleString("fa-IR")} روز کاری` : "ارسال قابل پیگیری"}</span><PackageCheck size={18} className="text-slate-500" /></span>
        </div>
      </div>
    </aside>}
    {showOptionFields && guideModal}
  </>;

  return <div className="grid gap-3">
    {optionFields}
    {addButton}
    {msg && <small className="block mt-2 text-[var(--brand-accent)]">{msg}</small>}
    {guideModal}
  </div>;
}
