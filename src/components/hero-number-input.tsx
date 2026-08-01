"use client";

import { Input } from "@heroui/react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { formatPersianNumber, normalizeNumericValue, priceToPersianWords, rialPriceToTomanWords } from "@/lib/persian-numbers";

type InputProps = ComponentProps<typeof Input>;

type HeroNumberInputProps = Omit<InputProps, "defaultValue" | "name" | "onChange" | "type" | "value"> & {
  name?: string;
  value?: string | number | null;
  defaultValue?: string | number | null;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  allowDecimal?: boolean;
  isPrice?: boolean;
  currency?: string;
  suffix?: ReactNode;
  reserveHelperSpace?: boolean;
  containerClassName?: string;
  onValueChange?: (value: string) => void;
};

export function HeroNumberInput({
  name,
  value,
  defaultValue,
  allowDecimal,
  isPrice = false,
  currency = "تومان",
  suffix,
  reserveHelperSpace = false,
  containerClassName = "",
  onValueChange,
  min,
  max,
  step,
  dir = "ltr",
  className = "",
  ...inputProps
}: HeroNumberInputProps) {
  const decimalEnabled = allowDecimal ?? (step !== undefined && String(step).includes("."));
  const [internalValue, setInternalValue] = useState(() => normalizeNumericValue(String(defaultValue ?? ""), decimalEnabled));
  const controlled = value !== undefined;
  const rawValue = controlled ? normalizeNumericValue(String(value ?? ""), decimalEnabled) : internalValue;
  const displayValue = formatPersianNumber(rawValue, isPrice);
  const words = isPrice ? currency === "تومان" ? rialPriceToTomanWords(rawValue) : priceToPersianWords(rawValue, currency) : "";

  function changeValue(nextDisplayValue: string) {
    const nextValue = normalizeNumericValue(nextDisplayValue, decimalEnabled);
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div className={`min-w-0 ${containerClassName}`} dir="rtl">
      <div className="relative">
        <Input
          {...inputProps}
          type="text"
          inputMode={decimalEnabled ? "decimal" : "numeric"}
          data-min={min}
          data-max={max}
          dir={dir}
          value={displayValue}
          className={`${className} ${suffix ? "pl-14" : ""}`}
          onChange={(event) => changeValue(event.target.value)}
        />
        {suffix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">{suffix}</span> : null}
      </div>
      {name && <input type="hidden" name={name} value={rawValue} />}
      {(words || reserveHelperSpace) && <p className="mt-1.5 min-h-4 break-words px-1 text-right text-[10px] leading-4 text-slate-500">{words || "\u00a0"}</p>}
    </div>
  );
}
