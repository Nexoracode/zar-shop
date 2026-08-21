"use client";
import { Info } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  purity: number;
  profitPercent: number;
  taxPercent: number;
  makingFeeType: string;
  makingFeeValue: number;
};

const percent = (value: number) => `${value.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}٪`;

export function PriceTooltip({ purity, profitPercent, taxPercent, makingFeeType, makingFeeValue }: Props) {
  // Mirrors calculateProductPrice: rawGold = rate × weight × purity/750, then making fee,
  // then profit on (rawGold + makingFee), then tax on (makingFee + profit).
  const rows: Array<[string, string]> = [
    ["طلای خام:", `وزن × نرخ روز × ${purity.toLocaleString("fa-IR")}÷۷۵۰`],
    ["اجرت:", makingFeeType === "FIXED"
      ? `+ ${makingFeeValue.toLocaleString("fa-IR")} (مبلغ ثابت)`
      : `+ ${percent(makingFeeValue)} از طلای خام`],
    ["سود:", `+ ${percent(profitPercent)} از طلای خام و اجرت`],
    ["مالیات:", `+ ${percent(taxPercent)} از اجرت و سود`],
  ];

  return (
    <Tooltip delay={150} closeDelay={100}>
      <Tooltip.Trigger>
      <Button type="button" variant="ghost" size="sm" className="h-auto min-h-0 px-0 text-[var(--brand-accent)] hover:brightness-110">
        <Info size={13} className="shrink-0" />
        نحوه محاسبه قیمت
      </Button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow dir="rtl" className="z-50 w-[270px] border-r-[3px] border-[var(--brand-accent)] bg-[var(--brand-primary)] p-4 text-right text-[var(--brand-primary-foreground)] shadow-2xl">
          <span className="text-[0.73rem] font-bold text-[var(--brand-accent)] tracking-[0.03em] pb-2 border-b border-white/10">
            فرمول محاسبه قیمت این محصول
          </span>
          <span className="flex flex-col gap-[7px]">
            {rows.map(([label, value]) => (
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
