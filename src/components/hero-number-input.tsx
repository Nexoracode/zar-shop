"use client";

import { Input } from "@heroui/react";
import { useState, type ComponentProps } from "react";
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
  containerClassName = "",
  onValueChange,
  min,
  max,
  step,
  dir = "ltr",
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
      <Input
        {...inputProps}
        type="text"
        inputMode={decimalEnabled ? "decimal" : "numeric"}
        data-min={min}
        data-max={max}
        dir={dir}
        value={displayValue}
        onChange={(event) => changeValue(event.target.value)}
      />
      {name && <input type="hidden" name={name} value={rawValue} />}
      {words && <p className="mt-1.5 min-h-4 break-words px-1 text-right text-[10px] leading-4 text-slate-500">{words}</p>}
    </div>
  );
}
