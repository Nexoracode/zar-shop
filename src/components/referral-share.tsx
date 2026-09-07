"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Check, Copy, Share2 } from "lucide-react";

/** The referral code and its invite link, each with a copy button. Latin/technical, so both are
 *  pinned `dir="ltr"` inside the surrounding RTL page. */
export function ReferralShare({ code, inviteUrl }: { code: string; inviteUrl: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      toast.success(which === "code" ? "کد معرف کپی شد" : "لینک دعوت کپی شد");
      setTimeout(() => setCopied((current) => (current === which ? null : current)), 2000);
    } catch {
      toast.danger("کپی انجام نشد؛ متن را دستی انتخاب کنید.");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 p-3">
        <span dir="ltr" className="flex-1 text-center font-mono text-xl font-bold tracking-[0.2em] text-[var(--brand-primary)]">{code}</span>
        <Button type="button" variant="secondary" size="sm" onPress={() => void copy(code, "code")} className="gap-1.5 rounded-lg">
          {copied === "code" ? <Check size={15} /> : <Copy size={15} />}
          کپی کد
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span dir="ltr" className="min-w-0 flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">{inviteUrl}</span>
        <Button type="button" variant="ghost" size="sm" onPress={() => void copy(inviteUrl, "link")} className="shrink-0 gap-1.5 rounded-lg text-[var(--brand-primary)]">
          {copied === "link" ? <Check size={15} /> : <Share2 size={15} />}
          لینک دعوت
        </Button>
      </div>
    </div>
  );
}
