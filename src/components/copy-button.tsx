"use client";

import { useEffect, useRef, useState } from "react";
import { Button, toast } from "@heroui/react";
import { Check, Copy } from "lucide-react";

/**
 * Copies `value` to the clipboard and confirms it — the icon turns into a check for a moment and a
 * toast names what was copied. `label` is what the button is called for assistive tech and what
 * the toast reports ("شماره کارت کپی شد"). Synchronous, so it needs no `isPending`.
 */
export function CopyButton({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
      toast.success(`${label} کپی شد`, { timeout: 2000 });
    } catch {
      toast.danger("کپی انجام نشد", { description: "مقدار را به‌صورت دستی انتخاب و کپی کنید." });
    }
  }

  return (
    <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`کپی ${label}`} onPress={() => void copy()} className={`size-9 min-h-9 min-w-9 shrink-0 rounded-lg ${className}`.trim()}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </Button>
  );
}
