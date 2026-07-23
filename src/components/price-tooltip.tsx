"use client";
import { Info } from "lucide-react";
import { useState } from "react";

export function PriceTooltip() {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-[5px] p-0 bg-transparent border-none text-[#785b27] text-[0.74rem] font-semibold cursor-pointer transition-colors hover:text-[#b5904c]"
      >
        <Info size={13} className="shrink-0" />
        نحوه محاسبه قیمت
      </button>

      {visible && (
        <span
          role="tooltip"
          className="absolute bottom-[calc(100%+10px)] right-0 z-20 w-[270px] p-4 flex flex-col gap-[10px] bg-[#132542] text-white border-r-[3px] border-[#b5904c] shadow-[0_14px_40px_rgba(12,24,44,0.22)] after:content-[''] after:absolute after:top-full after:right-[14px] after:border-[7px] after:border-transparent after:border-t-[#132542]"
        >
          <span className="text-[0.73rem] font-bold text-[#b5904c] tracking-[0.03em] pb-2 border-b border-white/10">
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
        </span>
      )}
    </span>
  );
}
