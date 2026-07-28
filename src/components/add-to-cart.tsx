"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toast } from "@heroui/react";
import { FileText, Ruler, X } from "lucide-react";

type SizeGuide = { url: string; type: "IMAGE" | "DOCUMENT"; title: string };

export function AddToCart({ productId, sizes = [], sizeGuide, disabled, disabledLabel = "ناموجود" }: { productId: string; sizes?: string[]; sizeGuide?: SizeGuide | null; disabled: boolean; disabledLabel?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  async function add() {
    if (sizes.length && !selectedSize) {
      toast.danger("سایز محصول را انتخاب کنید", { description: "پیش از افزودن محصول به سبد خرید، یکی از سایزهای موجود را انتخاب کنید.", timeout: 4500 });
      return;
    }
    setLoading(true);
    setMsg("");
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1, selectedSize }),
    });
    const data = await r.json();
    setLoading(false);
    if (r.status === 401) { router.push("/login?next=/cart"); return; }
    setMsg(data.message ?? "");
    if (r.ok) router.refresh();
  }

  return (
    <div className="grid gap-3">
      {sizes.length > 0 && <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#17233b]">انتخاب سایز</strong>{sizeGuide && <Button type="button" variant="ghost" onPress={() => setGuideOpen(true)} className="h-auto min-h-0 gap-1 p-0 text-xs font-bold text-[#785b27]"><Ruler size={15} />راهنمای سایز</Button>}</div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="انتخاب سایز محصول">{sizes.map((size) => <Button key={size} type="button" variant="secondary" aria-pressed={selectedSize === size} onPress={() => setSelectedSize(size)} className={`min-h-10 min-w-12 rounded-lg border px-3 text-sm font-bold transition ${selectedSize === size ? "border-[#b5904c] bg-[#b5904c] text-white" : "border-[#d8d5ce] bg-white text-[#17233b] hover:border-[#b5904c]"}`}>{size}</Button>)}</div>
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
      {sizeGuide && <Modal.Backdrop isOpen={guideOpen} onOpenChange={setGuideOpen} variant="blur"><Modal.Container size="lg" placement="center"><Modal.Dialog aria-label="راهنمای انتخاب سایز" className="mx-3 max-h-[calc(100dvh-32px)] overflow-hidden bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4"><div><Modal.Heading className="text-base font-black text-slate-900">راهنمای انتخاب سایز</Modal.Heading><p className="mt-1 text-xs text-slate-500">{sizeGuide.title}</p></div><Modal.CloseTrigger aria-label="بستن راهنمای سایز" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="min-h-64 bg-slate-50 p-3 sm:p-5">{sizeGuide.type === "IMAGE" ? <div className="relative min-h-[55vh] w-full overflow-hidden rounded-xl bg-white"><Image src={sizeGuide.url} alt={sizeGuide.title} fill sizes="90vw" className="object-contain" /></div> : <div className="grid gap-3"><iframe src={sizeGuide.url} title={sizeGuide.title} className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white" /><a href={sizeGuide.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d8c29a] bg-white text-sm font-bold text-[#785b27]"><FileText size={16} />باز کردن فایل PDF در صفحه جدید</a></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>}
    </div>
  );
}
