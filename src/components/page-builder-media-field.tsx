"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";

/**
 * An image chosen from the media library, as the page builder's forms show it: a preview, "choose/change" and
 * "remove" buttons, an optional hint and the validation message under the control. Choosing is the parent's job
 * (it owns the library dialog), so this only reports `onPick` / `onClear`.
 */
export function BuilderMediaField({ id, label, required, media, hint, error, disabled, onPick, onClear }: {
  id: string;
  label: ReactNode;
  required?: boolean;
  media: MediaChoice | null;
  hint?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  const messageId = `${id}-message`;
  return (
    <div>
      <span className="field-label">{label}{required && <span aria-hidden className="text-[var(--danger)]"> *</span>}</span>
      <div className="mt-2 flex items-center gap-3">
        <span className={`relative grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border bg-[var(--surface-secondary)] text-[var(--muted)] ${error ? "border-[var(--danger)]" : "border-[var(--border)]"}`}>
          {media ? <Image src={media.url} alt={media.alt ?? media.title} fill sizes="112px" className="object-contain p-1.5" /> : <ImageIcon size={24} strokeWidth={1.5} />}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button id={id} type="button" variant="outline" isDisabled={disabled} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? messageId : undefined} onPress={onPick} className="min-h-10 rounded-lg px-4 text-sm font-bold">{media ? "تغییر تصویر" : "انتخاب تصویر"}</Button>
          {media && <Button type="button" variant="ghost" isDisabled={disabled} onPress={onClear} className="min-h-10 rounded-lg px-4 text-sm font-bold text-[var(--danger)]">حذف تصویر</Button>}
        </div>
      </div>
      <span id={messageId} className={`field-message mt-2 block ${error ? "field-message-error" : "field-message-hint"}`}>{error ?? hint ?? ""}</span>
    </div>
  );
}
