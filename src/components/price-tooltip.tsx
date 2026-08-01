"use client";
import { Info } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

export function PriceTooltip() {
  return (
    <Tooltip delay={150} closeDelay={100}>
      <Tooltip.Trigger>
      <Button type="button" variant="ghost" size="sm" className="h-auto min-h-0 px-0 text-[var(--brand-accent)] hover:brightness-110">
        <Info size={13} className="shrink-0" />
        نحوه محاسبه قیمت
      </Button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow className="z-50 w-[270px] border-r-[3px] border-[var(--brand-accent)] bg-[var(--brand-primary)] p-4 text-[var(--brand-primary-foreground)] shadow-2xl">
          <span className="text-[0.73rem] font-bold text-[var(--brand-accent)] tracking-[0.03em] pb-2 border-b border-white/10">
            فرمول محاسبه قیمت طلا
          </span>
          <span className="flex flex-col gap-[7px]">
            {[
              ["پایه:", "وزن طلا × (قیمت روز طلا + اجرت)"],
              ["سود:", "+ ۷٪ سود"],
              ["متعلقات:", "+ متعلقات"],
              ["مالیات:", "+ ۱۰٪ مالیات از سود و اجرت"],
            ].map(([label, value]) => (
              <span key={label} className="flex items-baseline gap-[7px] text-[0.72rem] leading-relaxed">
                <span className="shrink-0 text-white/55 text-[0.68rem] min-w-[52px]">{label}</span>
                <span>{value}</span>
              </span>
            ))}
          </span>
      </Tooltip.Content>
    </Tooltip>
  );
}
