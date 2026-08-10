"use client";
import Image from "next/image";
import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import { FileText, PackageCheck, Ruler, ShieldCheck, X } from "lucide-react";
import { formatMoney } from "@/lib/format";

type OptionGuide = { url: string; type: "IMAGE" | "DOCUMENT"; title: string };
type ProductOption = { id: string; name: string; kind: "COLOR" | "SELECT"; values: Array<{ value: string; stock: number; weightGrams: string | null; price: number | null; color: { name: string; hex: string } | null }> };

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

export function AddToCart({ productId, options = [], optionGuide, disabled, disabledLabel = "ناموجود", currency = "IRR", layout = "default", purchaseSummary, preparationDays = 0, showOptionFields = true, showPurchaseCard = true, purchaseCardClassName }: { productId: string; options?: ProductOption[]; optionGuide?: OptionGuide | null; disabled: boolean; disabledLabel?: string; currency?: "IRR" | "IRT"; layout?: "default" | "product-detail"; purchaseSummary?: ReactNode; preparationDays?: number; showOptionFields?: boolean; showPurchaseCard?: boolean; purchaseCardClassName?: string }) {
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
  const optionStockUnavailable = options.some((option) => !option.values.some((item) => item.stock > 0));
  const selectedWeightValue = options.flatMap((option) => option.values.filter((item) => selectedOptions[option.id] === item.value)).find((item) => item.weightGrams);
  const selectedPriceValue = options.flatMap((option) => option.values.filter((item) => selectedOptions[option.id] === item.value)).find((item) => item.price !== null);

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
    if (r.ok) router.refresh();
  }

  const optionFields = options.length > 0 ? <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3"><strong className="text-sm text-[var(--brand-primary)]">انتخاب تنوع محصول</strong>{optionGuide && <Button type="button" variant="ghost" onPress={() => setGuideOpen(true)} className="h-auto min-h-0 gap-1 p-0 text-xs font-bold text-[var(--brand-accent)]"><Ruler size={15} />راهنمای انتخاب</Button>}</div>
        {options.map((option) => <div key={option.id} className="grid gap-2.5">{option.kind === "COLOR" ? <><span className="text-sm font-bold text-slate-900">رنگ: <strong>{option.values.find((item) => selectedOptions[option.id] === item.value)?.color?.name ?? option.values.find((item) => selectedOptions[option.id] === item.value)?.value ?? "انتخاب کنید"}</strong></span><div className="flex flex-wrap gap-3" role="group" aria-label={`انتخاب ${option.name}`}>{option.values.map((item) => { const selected = selectedOptions[option.id] === item.value; const unavailable = item.stock < 1; return <Button key={item.value} type="button" isIconOnly variant="secondary" isDisabled={unavailable} aria-pressed={selected} aria-label={`${item.value}${item.color ? `، رنگ ${item.color.name}` : ""}${unavailable ? "، ناموجود" : selected ? "، انتخاب‌شده" : ""}`} onPress={() => setSelectedOptions((current) => ({ ...current, [option.id]: item.value }))} className={`relative size-11 min-h-11 min-w-11 rounded-full border-2 bg-white p-1 transition ${unavailable ? "border-slate-200 opacity-45" : selected ? "border-slate-800 shadow-[0_0_0_2px_white,0_0_0_4px_#1f2937]" : "border-slate-200 hover:border-slate-500"}`}><span className="block size-full rounded-full border border-black/10" style={{ backgroundColor: item.color?.hex ?? "#e5e7eb" }} />{selected && <span className="absolute inset-0 grid place-items-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">✓</span>}{unavailable && <span className="absolute inset-1 rotate-45 border-l border-slate-500" />}</Button>; })}</div></> : <><span className="text-xs font-bold text-[#525966]">{option.name}</span><div className="flex flex-wrap gap-2" role="group" aria-label={`انتخاب ${option.name}`}>{option.values.map((item) => { const selected = selectedOptions[option.id] === item.value; const unavailable = item.stock < 1; return <Button key={item.value} type="button" variant="secondary" isDisabled={unavailable} aria-pressed={selected} aria-label={`${item.value}${item.weightGrams ? `، وزن ${item.weightGrams} گرم` : ""}${unavailable ? "، ناموجود" : selected ? "، انتخاب‌شده" : ""}`} onPress={() => setSelectedOptions((current) => ({ ...current, [option.id]: item.value }))} className={`min-h-10 min-w-12 rounded-lg border px-3 text-sm font-bold transition ${unavailable ? "border-slate-200 bg-slate-100 text-slate-400 line-through" : selected ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] ring-2 ring-[var(--brand-accent)]/25" : "border-[#d8d5ce] bg-white text-[var(--brand-primary)] hover:border-[var(--brand-accent)]"}`}>{item.value}{item.weightGrams && <small className="mr-1 text-[10px] opacity-75">{item.weightGrams} گرم</small>}{unavailable && <small className="mr-1 text-[10px]">ناموجود</small>}</Button>; })}</div></>}</div>)}
        {selectedWeightValue && <div className="flex items-center justify-between rounded-lg border border-[#dfd3bc] bg-white px-3 py-2 text-xs"><span className="text-[#747982]">وزن انتخاب‌شده: {selectedWeightValue.weightGrams} گرم</span><strong className="text-[#17233b]">{selectedWeightValue.price === null ? "قیمت موقتاً نامشخص" : formatMoney(selectedWeightValue.price, currency)}</strong></div>}
        {!selectedWeightValue && selectedPriceValue && <div className="flex items-center justify-between rounded-lg border border-[#dfd3bc] bg-white px-3 py-2 text-xs"><span className="text-[#747982]">قیمت تنوع انتخاب‌شده</span><strong className="text-[#17233b]">{formatMoney(selectedPriceValue.price!, currency)}</strong></div>}
      </div> : null;
  const addButton = <Button
        onPress={() => void add()}
        isDisabled={disabled || optionStockUnavailable}
        isPending={loading}
        fullWidth
        variant="primary"
        className="w-full min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center gap-[9px] border border-[var(--brand-primary)] rounded-sm bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] transition-all duration-200 hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{disabled ? disabledLabel : optionStockUnavailable ? "تنوع موجودی ندارد" : isPending ? "در حال افزودن..." : "افزودن به سبد"}</>}
      </Button>;
  const guideModal = optionGuide && <Modal.Backdrop isOpen={guideOpen} onOpenChange={setGuideOpen} variant="blur"><Modal.Container size="lg" placement="center"><Modal.Dialog aria-label="راهنمای انتخاب محصول" className="mx-3 max-h-[calc(100dvh-32px)] overflow-hidden bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4"><div><Modal.Heading className="text-base font-black text-slate-900">راهنمای انتخاب</Modal.Heading><p className="mt-1 text-xs text-slate-500">{optionGuide.title}</p></div><Modal.CloseTrigger aria-label="بستن راهنمای انتخاب" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="min-h-64 bg-slate-50 p-3 sm:p-5">{optionGuide.type === "IMAGE" ? <div className="relative min-h-[55vh] w-full overflow-hidden rounded-xl bg-white"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="90vw" className="object-contain" /></div> : <div className="grid gap-3"><iframe src={optionGuide.url} title={optionGuide.title} className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white" /><a href={optionGuide.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d8c29a] bg-white text-sm font-bold text-[#785b27]"><FileText size={16} />باز کردن فایل PDF در صفحه جدید</a></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>;

  if (layout === "product-detail") return <>
    {showOptionFields && optionFields && <section className="grid gap-4 border-t border-slate-200 pt-5 lg:col-start-2 lg:row-start-2" aria-label="انتخاب تنوع محصول">{optionFields}</section>}
    {showPurchaseCard && <aside className={purchaseCardClassName ?? "lg:col-start-3 lg:row-span-2 lg:row-start-1"}>
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm lg:sticky lg:top-24">
        <strong className="text-base font-black text-slate-900">خرید این محصول</strong>
        {purchaseSummary}
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
