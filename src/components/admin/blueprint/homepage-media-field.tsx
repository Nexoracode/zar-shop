"use client";

import Image from "next/image";
import { Images, Trash2, Upload } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";
import { BpButton } from "./ui/button";

/** One picked-image slot: preview + change/remove, reused across hero/tiles/promo/hub media fields. */
export function BpHomepageMediaField({ label, hint, media, onSelect, onClear, aspectClass = "aspect-[16/9]" }: {
  label: string;
  hint: string;
  media: MediaChoice | null;
  onSelect: () => void;
  onClear: () => void;
  aspectClass?: string;
}) {
  return (
    <div className="border border-[var(--bp-divider)]">
      <div className={`relative ${aspectClass} bg-[var(--bp-bg)]`}>
        {media
          ? <Image src={media.url} alt={media.title} fill unoptimized={media.mimeType === "image/gif"} sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
          : <span className="bp-muted grid h-full place-items-center"><Images size={22} /></span>}
      </div>
      <div className="grid gap-1.5 p-2.5">
        <div className="min-w-0">
          <strong className="block text-[12px]">{label}</strong>
          <span className="bp-muted block truncate text-[10px]" title={media?.title || hint}>{media?.title || hint}</span>
        </div>
        <div className="flex gap-1.5">
          <BpButton type="button" size="sm" onClick={onSelect} className="flex-1 gap-1"><Upload size={12} />{media ? "تغییر" : "انتخاب"}</BpButton>
          {media && <BpButton type="button" size="sm" isIconOnly variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ${label}`} onClick={onClear}><Trash2 size={12} /></BpButton>}
        </div>
      </div>
    </div>
  );
}
