"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CircleCheck, FileEdit } from "lucide-react";
import { toast } from "@heroui/react";
import type { ProductStatus } from "@generated/prisma/enums";
import { productStatusLabels } from "@/modules/admin/labels";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BpButton } from "./ui/button";
import { BpPopover } from "./ui/popover";

const statusIcons: Record<ProductStatus, typeof CircleCheck> = {
  ACTIVE: CircleCheck,
  DRAFT: FileEdit,
  ARCHIVED: Archive,
};

const statusOrder: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

/**
 * Row-level status menu — three states (منتشرشده / پیش‌نویس / بایگانی‌شده), so a single click
 * can no longer just flip a switch between two of them; it opens a small menu instead.
 */
export function ProductStatusMenu({ id, name, status }: { id: string; name: string; status: ProductStatus }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const Icon = statusIcons[status];
  const title = `وضعیت انتشار: ${productStatusLabels[status]}`;

  async function change(next: ProductStatus) {
    if (next === status) { setOpen(false); return; }
    setOpen(false);
    setPending(true);
    try {
      await requestJson(`/api/admin/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      }, { fallbackMessage: "تغییر وضعیت انجام نشد." });
      toast.success("وضعیت محصول تغییر کرد", { description: `${name}: ${productStatusLabels[next]}` });
      router.refresh();
    } catch (reason) {
      toast.danger("تغییر وضعیت انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <BpButton
        ref={triggerRef}
        variant="ghost"
        isIconOnly
        size="sm"
        isPending={pending}
        title={title}
        aria-label={`${title} — ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {!pending && <Icon size={15} strokeWidth={1.5} />}
      </BpButton>
      <BpPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} label={`وضعیت انتشار محصول ${name}`} width={180}>
        <ul role="menu" className="m-0 list-none p-0">
          {statusOrder.map((value) => {
            const OptionIcon = statusIcons[value];
            return (
              <li key={value}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={value === status}
                  onClick={() => void change(value)}
                  className={`flex w-full items-center gap-2 border border-transparent px-3 py-2 text-start text-[13px] hover:bg-[var(--bp-hover)] ${value === status ? "font-bold text-[var(--bp-accent)]" : ""}`}
                >
                  <OptionIcon size={14} strokeWidth={1.7} />
                  {productStatusLabels[value]}
                </button>
              </li>
            );
          })}
        </ul>
      </BpPopover>
    </>
  );
}
