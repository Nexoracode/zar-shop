"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode, type SelectHTMLAttributes } from "react";

export type BpSelectOption = { value: string; label: string; disabled?: boolean };

type BpSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: BpSelectOption[];
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
};

export function BpSelect({ label, hint, error, options, placeholder, className = "", wrapperClassName = "", id, ...rest }: BpSelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={selectId}>{label}</label>}
      <div className="bp-select-wrap">
        <select id={selectId} aria-invalid={error ? true : undefined} className={`bp-input ${className}`.trim()} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden />
      </div>
      {hint && !error && <span className="bp-muted mt-1 block text-[11px] leading-5">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] leading-5 text-[var(--bp-danger)]">{error}</span>}
    </div>
  );
}
