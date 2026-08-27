"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FileBarChart2, MoreVertical, ShoppingCart } from "lucide-react";
import { toast } from "@heroui/react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BpButton } from "./ui/button";
import { BpPopover } from "./ui/popover";

/** The row's overflow menu: actions that don't earn their own icon in the action group. */
export function ProductRowMenu({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function duplicate() {
    setOpen(false);
    setDuplicating(true);
    try {
      const result = await requestJson<{ id: string }>(`/api/products/${id}/duplicate`, { method: "POST" }, { fallbackMessage: "تکثیر محصول انجام نشد." });
      toast.success("یک نسخه تکثیرشده از محصول ساخته شد", { description: name });
      router.push(`/admin/products/${result.id}/edit`);
      router.refresh();
    } catch (reason) {
      toast.danger("تکثیر محصول انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setDuplicating(false);
    }
  }

  return (
    <>
      <BpButton
        ref={triggerRef}
        isIconOnly
        variant="ghost"
        size="sm"
        isPending={duplicating}
        title="عملیات بیشتر"
        aria-label={`عملیات بیشتر برای ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {!duplicating && <MoreVertical size={15} strokeWidth={1.5} />}
      </BpButton>
      <BpPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} label={`عملیات بیشتر برای ${name}`} width={190}>
        <ul role="menu" className="m-0 list-none p-0">
          <li>
            <button type="button" role="menuitem" onClick={() => void duplicate()} className="flex w-full items-center gap-2 border border-transparent px-3 py-2 text-start text-[13px] hover:bg-[var(--bp-hover)]">
              <Copy size={14} strokeWidth={1.7} />تکثیر کردن
            </button>
          </li>
          <li>
            <Link href={`/admin/products/${id}/report`} role="menuitem" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 border border-transparent px-3 py-2 text-[13px] hover:bg-[var(--bp-hover)]">
              <FileBarChart2 size={14} strokeWidth={1.7} />گزارشات
            </Link>
          </li>
          <li>
            <Link href={`/admin/orders?product=${id}`} role="menuitem" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 border border-transparent px-3 py-2 text-[13px] hover:bg-[var(--bp-hover)]">
              <ShoppingCart size={14} strokeWidth={1.7} />سفارشات
            </Link>
          </li>
        </ul>
      </BpPopover>
    </>
  );
}
