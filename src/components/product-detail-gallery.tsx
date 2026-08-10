"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ImageIcon, Play } from "lucide-react";

type ProductGalleryMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  alt: string;
};

export function ProductDetailGallery({ media, productName, productCode }: { media: ProductGalleryMedia[]; productName: string; productCode: string }) {
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? "");
  const selected = media.find((item) => item.id === selectedId) ?? media[0];

  return <section className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1" aria-label="گالری محصول">
    <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {selected?.type === "IMAGE" ? <Image src={selected.url} alt={selected.alt || productName} fill priority sizes="(max-width: 1024px) 100vw, 38vw" className="object-contain p-3 sm:p-6" /> : selected?.type === "VIDEO" ? <video key={selected.id} src={selected.url} controls className="h-full w-full object-contain" aria-label={selected.alt || `ویدیوی ${productName}`} /> : <div className="grid place-items-center gap-3 text-slate-300"><ImageIcon size={52} /><span className="text-xs">تصویری برای این محصول ثبت نشده است</span></div>}
    </div>

    {media.length > 1 && <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5" role="group" aria-label="انتخاب تصویر محصول">
      {media.map((item) => <Button key={item.id} type="button" isIconOnly variant="secondary" aria-label={`نمایش ${item.alt || productName}`} aria-pressed={item.id === selected?.id} onPress={() => setSelectedId(item.id)} className={`relative aspect-square h-auto min-h-0 w-full min-w-0 overflow-hidden rounded-xl border bg-white p-0 ${item.id === selected?.id ? "border-slate-800 ring-2 ring-slate-200" : "border-slate-200 hover:border-slate-400"}`}>
        {item.type === "IMAGE" ? <Image src={item.url} alt={item.alt || productName} fill sizes="74px" className="object-contain p-1.5" /> : <><video src={item.url} muted className="h-full w-full object-cover" aria-hidden="true" /><span className="absolute inset-0 grid place-items-center bg-black/20 text-white"><Play size={20} fill="currentColor" /></span></>}
      </Button>)}
    </div>}
    <p dir="ltr" className="mt-2 text-center text-[10px] text-slate-400">{productCode}</p>
  </section>;
}
