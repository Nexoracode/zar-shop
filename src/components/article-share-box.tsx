"use client";

import { Button, toast } from "@heroui/react";
import { Link as LinkIcon, Send } from "lucide-react";

export function ArticleShareBox({ title, url }: { title: string; url: string }) {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک مقاله کپی شد");
    } catch {
      toast.danger("کپی لینک انجام نشد");
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-2.5 text-[11px] font-bold text-[var(--muted)]">اشتراک‌گذاری</div>
      <div className="flex gap-2">
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noreferrer"
          aria-label="اشتراک‌گذاری در تلگرام"
          className="grid size-9 place-items-center rounded-full border border-[var(--border)] text-[var(--foreground)] transition hover:border-[var(--brand-accent)]"
        >
          <Send size={16} />
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          aria-label="اشتراک‌گذاری در واتساپ"
          className="grid size-9 place-items-center rounded-full border border-[var(--border)] text-[var(--foreground)] transition hover:border-[var(--brand-accent)]"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12.05 22C6.526 22 2.05 17.523 2.05 12S6.526 2 12.05 2s10 4.477 10 10-4.477 10-10 10zm0-1.5c4.694 0 8.5-3.806 8.5-8.5S16.744 3.5 12.05 3.5s-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z" /></svg>
        </a>
        <Button type="button" onPress={() => void copyLink()} isIconOnly variant="ghost" aria-label="کپی لینک" className="size-9 rounded-full border border-[var(--border)]">
          <LinkIcon size={16} />
        </Button>
      </div>
    </div>
  );
}
