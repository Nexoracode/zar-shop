"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { CloudUpload, ImageIcon, Info, Trash2 } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";

/**
 * The large image slot of the builder's banner form: the picked image shown whole on a checkerboard (so transparent
 * areas read as such), a round upload button in its corner to choose/replace it, the recommended size or the
 * validation message under it, and — for an optional image — a way to remove it. Choosing is the parent's job (it
 * owns the media library dialog), so this only reports `onPick` / `onClear`.
 */
export function BuilderImagePreview({ id, label, required, media, hint, error, disabled, heightClass = "h-44", onPick, onClear }: {
  id: string;
  label: ReactNode;
  required?: boolean;
  media: MediaChoice | null;
  /** The recommended size or another note; the error takes this line over while there is one. */
  hint?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  heightClass?: string;
  onPick: () => void;
  /** Only for an optional image. */
  onClear?: () => void;
}) {
  const messageId = `${id}-message`;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="field-label">{label}{required && <span aria-hidden className="text-[var(--danger)]"> *</span>}</span>
        {media && onClear && <Button type="button" variant="ghost" isDisabled={disabled} onPress={onClear} className="h-auto min-h-0 gap-1 px-2 py-1 text-xs font-bold text-[var(--danger)]"><Trash2 size={14} />حذف تصویر</Button>}
      </div>
      <div className={`relative mt-2 overflow-hidden rounded-2xl border bg-white [background-image:conic-gradient(#eceef1_25%,#fff_0_50%,#eceef1_0_75%,#fff_0)] [background-size:16px_16px] ${heightClass} ${error ? "border-[var(--danger)]" : "border-[var(--border)]"}`}>
        {media
          ? <Image src={media.url} alt={media.alt ?? media.title} fill unoptimized={media.mimeType === "image/gif"} sizes="520px" className="object-contain" />
          : <span className="absolute inset-0 grid place-items-center text-[var(--muted)]"><ImageIcon size={28} strokeWidth={1.4} /></span>}
        <Button id={id} type="button" isIconOnly variant="secondary" isDisabled={disabled} aria-label={media ? "تغییر تصویر" : "انتخاب تصویر"} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? messageId : undefined} onPress={onPick} className="absolute left-2 top-2 size-9 min-h-9 min-w-9 rounded-lg bg-white shadow-sm"><CloudUpload size={18} /></Button>
      </div>
      <span id={messageId} className={`field-message mt-2 flex items-start gap-1.5 ${error ? "field-message-error" : "field-message-hint"}`}>
        {!error && hint && <span aria-hidden className="flex h-lh shrink-0 items-center"><Info size={14} /></span>}
        <span>{error ?? hint ?? ""}</span>
      </span>
    </div>
  );
}
