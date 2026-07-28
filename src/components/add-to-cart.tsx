"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toast } from "@heroui/react";
import { FileText, Ruler, X } from "lucide-react";

type OptionGuide = { url: string; type: "IMAGE" | "DOCUMENT"; title: string };
type ProductOption = { id: string; name: string; values: string[] };

export function AddToCart({ productId, options = [], optionGuide, disabled, disabledLabel = "ناموجود" }: { productId: string; options?: ProductOption[]; optionGuide?: OptionGuide | null; disabled: boolean; disabledLabel?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [guideOpen, setGuideOpen] = useState(false);

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

  return (
    <div className="grid gap-3">
      {options.length > 0 && <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#17233b]">انتخاب مشخصات محصول</strong>{optionGuide && <Button type="button" variant="ghost" onPress={() => setGuideOpen(true)} className="h-auto min-h-0 gap-1 p-0 text-xs font-bold text-[#785b27]"><Ruler size={15} />راهنمای انتخاب</Button>}</div>
        {options.map((option) => <div key={option.id} className="grid gap-2"><span className="text-xs font-bold text-[#525966]">{option.name}</span><div className="flex flex-wrap gap-2" role="group" aria-label={`انتخاب ${option.name}`}>{option.values.map((value) => <Button key={value} type="button" variant="secondary" aria-pressed={selectedOptions[option.id] === value} onPress={() => setSelectedOptions((current) => ({ ...current, [option.id]: value }))} className={`min-h-10 min-w-12 rounded-lg border px-3 text-sm font-bold transition ${selectedOptions[option.id] === value ? "border-[#b5904c] bg-[#b5904c] text-white" : "border-[#d8d5ce] bg-white text-[#17233b] hover:border-[#b5904c]"}`}>{value}</Button>)}</div></div>)}
      </div>}
      <Button
        onPress={() => void add()}
        isDisabled={disabled || loading}
        fullWidth
        variant="primary"
        className="w-full min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center gap-[9px] border border-[#b5904c] rounded-sm bg-[#b5904c] text-white transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {disabled ? disabledLabel : loading ? "در حال افزودن..." : "افزودن به سبد"}
      </Button>
      {msg && <small className="block mt-2 text-[#785b27]">{msg}</small>}
      {optionGuide && <Modal.Backdrop isOpen={guideOpen} onOpenChange={setGuideOpen} variant="blur"><Modal.Container size="lg" placement="center"><Modal.Dialog aria-label="راهنمای انتخاب محصول" className="mx-3 max-h-[calc(100dvh-32px)] overflow-hidden bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4"><div><Modal.Heading className="text-base font-black text-slate-900">راهنمای انتخاب</Modal.Heading><p className="mt-1 text-xs text-slate-500">{optionGuide.title}</p></div><Modal.CloseTrigger aria-label="بستن راهنمای انتخاب" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="min-h-64 bg-slate-50 p-3 sm:p-5">{optionGuide.type === "IMAGE" ? <div className="relative min-h-[55vh] w-full overflow-hidden rounded-xl bg-white"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="90vw" className="object-contain" /></div> : <div className="grid gap-3"><iframe src={optionGuide.url} title={optionGuide.title} className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white" /><a href={optionGuide.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d8c29a] bg-white text-sm font-bold text-[#785b27]"><FileText size={16} />باز کردن فایل PDF در صفحه جدید</a></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>}
    </div>
  );
}
