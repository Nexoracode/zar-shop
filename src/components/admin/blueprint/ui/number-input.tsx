"use client";

import type { ReactNode } from "react";
import { formatPersianNumber, normalizeNumericValue, priceToPersianWords, rialPriceToTomanWords } from "@/lib/persian-numbers";
import { BpInput } from "./input";

/**
 * The Blueprint counterpart to `HeroNumberInput`: same contract, this template's looks.
 *
 * The field shows Persian digits grouped in threes and, for a price, spells the amount out
 * underneath. The words go in the field's own hint slot rather than a line of their own, so the
 * error still takes that slot when there is one and nothing shifts as it comes and goes.
 *
 * Stored values are in rials; the words read in tomans, which is what the reader thinks in.
 */
export function BpNumberInput({ name, value, onValueChange, isPrice = false, currency = "تومان", allowDecimal = false, hint, ...rest }: {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Group the digits and spell the amount out below. */
  isPrice?: boolean;
  currency?: string;
  allowDecimal?: boolean;
  hint?: ReactNode;
  label?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  wrapperClassName?: string;
  className?: string;
}) {
  const raw = normalizeNumericValue(value, allowDecimal);
  const words = isPrice
    ? currency === "تومان" ? rialPriceToTomanWords(raw) : priceToPersianWords(raw, currency)
    : "";

  return (
    <>
      <BpInput
        {...rest}
        data-field={name}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        dir="ltr"
        value={formatPersianNumber(raw, isPrice)}
        hint={words || hint}
        onChange={(event) => onValueChange(normalizeNumericValue(event.target.value, allowDecimal))}
      />
      {/* The visible box carries the grouped text, so the plain number travels separately. */}
      {name && <input type="hidden" name={name} value={raw} />}
    </>
  );
}
