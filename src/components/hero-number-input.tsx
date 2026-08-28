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
  /** Shown in the same slot as the spelled-out amount — an error there takes it over. */
  hint?: ReactNode;
  error?: ReactNode;
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
  hint,
  error,
  id,
  ...inputProps
}: HeroNumberInputProps) {
  const decimalEnabled = allowDecimal ?? (step !== undefined && String(step).includes("."));
  const [internalValue, setInternalValue] = useState(() => normalizeNumericValue(String(defaultValue ?? ""), decimalEnabled));
  const controlled = value !== undefined;
  const rawValue = controlled ? normalizeNumericValue(String(value ?? ""), decimalEnabled) : internalValue;
  const displayValue = formatPersianNumber(rawValue, isPrice);
  const words = isPrice ? currency === "تومان" ? rialPriceToTomanWords(rawValue) : priceToPersianWords(rawValue, currency) : "";
  const message = error ?? hint ?? (words || undefined);
  const messageId = id ? `${id}-message` : undefined;

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
          id={id}
          type="text"
          inputMode={decimalEnabled ? "decimal" : "numeric"}
          data-field={name}
          data-min={min}
          data-max={max}
          dir={dir}
          value={displayValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`${className} ${error ? "!border-[var(--danger)]" : ""} ${suffix ? "pl-14" : ""}`}
          onChange={(event) => changeValue(event.target.value)}
        />
        {suffix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">{suffix}</span> : null}
      </div>
      {name && <input type="hidden" name={name} value={rawValue} />}
      {(message || reserveHelperSpace) && (
        <p id={messageId} className={`mt-1.5 min-h-4 break-words px-1 text-right text-[10px] leading-4 ${error ? "font-bold text-[var(--danger)]" : "text-slate-500"}`}>
          {message || " "}
        </p>
      )}
    </div>
  );
}
