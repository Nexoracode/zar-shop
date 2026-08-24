"use client";

import { Check, Minus } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export function BpCheckbox({ isSelected, isIndeterminate = false, isDisabled = false, label, onChange, children, className = "" }: {
  isSelected: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  /** Accessible name when the box has no visible text beside it (table rows, select-all). */
  label?: string;
  onChange: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // `indeterminate` is a DOM property with no HTML attribute, so it has to be written directly.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  return (
    <label className={`bp-check ${isDisabled ? "cursor-not-allowed opacity-55" : ""} ${className}`.trim()}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={isSelected}
        disabled={isDisabled}
        aria-label={children ? undefined : label}
        onChange={onChange}
      />
      <span aria-hidden className="bp-check-box">
        {isIndeterminate ? <Minus size={12} strokeWidth={3} /> : isSelected ? <Check size={12} strokeWidth={3} /> : null}
      </span>
      {children && <span>{children}</span>}
    </label>
  );
}
